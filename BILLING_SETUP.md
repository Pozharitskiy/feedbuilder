# 💰 Shopify Billing API Setup Guide

Пошаговая инструкция для настройки реальных платежей через Shopify Billing API.

---

## 📋 Шаг 1: Shopify Partners Dashboard

### 1.1 Открой Partners Dashboard
1. Зайди на https://partners.shopify.com/
2. Перейди в **Apps** → выбери свое приложение
3. Нажми **Configuration** или **App setup**

### 1.2 Включи Billing API
В разделе **App pricing** / **Monetization**:
- ✅ Включи **"Billing API access"**
- Выбери тип: **"Recurring application charge"** (подписка)
- Сохрани изменения

### 1.3 Настройка Distribution
В разделе **Distribution**:
- Если планируешь публиковать в App Store: выбери **"Public"**
- Для тестирования: можно оставить **"Custom"** или **"Unlisted"**

---

## 🔐 Шаг 2: Обновить Scopes (Permissions)

### 2.1 В Partners Dashboard
1. Перейди в **Configuration** → **App setup**
2. Найди раздел **Admin API access scopes**
3. Добавь следующие scopes (если их нет):

**Обязательные для billing:**
- ✅ `read_products` (уже есть)
- ✅ `write_products` (для обновлений)
- ✅ **`read_subscriptions`** ← ДОБАВИТЬ
- ✅ **`write_subscriptions`** ← ДОБАВИТЬ

**Опционально (полезные):**
- `read_orders` (для аналитики)
- `read_customers` (для персонализации)

4. Сохрани изменения

### 2.2 Обнови `.env` файл

Измени переменную `SCOPES`:

```env
# До
SCOPES=read_products

# После
SCOPES=read_products,write_products,read_subscriptions,write_subscriptions
```

### 2.3 Важно!
⚠️ **После изменения scopes нужно ПЕРЕУСТАНОВИТЬ приложение** на всех магазинах!

Пользователи получат уведомление от Shopify о новых permissions и должны будут заново авторизовать приложение.

---

## 💻 Шаг 3: Реализовать настоящий Billing API

### 3.1 Обновить `src/services/billingService.ts`

Замени мок-реализацию на настоящий GraphQL запрос:

```typescript
// Create Shopify recurring charge
async createCharge(
  shop: string,
  planName: PlanName
): Promise<{ confirmationUrl: string; chargeId: string }> {
  const plan = PLANS[planName];
  if (!plan || plan.price === 0) {
    throw new Error("Cannot create charge for free plan");
  }

  // Get session
  const session = sessionStorage.getSession(shop);
  if (!session) {
    throw new Error("Shop session not found");
  }

  // Import shopifyApi for GraphQL client
  const { shopifyApi } = await import("@shopify/shopify-api");
  
  // Initialize GraphQL client
  const client = new shopifyApi.clients.Graphql({
    session: {
      shop: session.shop,
      accessToken: session.accessToken,
    },
  });

  // Create recurring charge via GraphQL
  const response = await client.query({
    data: {
      query: `
        mutation AppSubscriptionCreate(
          $name: String!
          $returnUrl: URL!
          $trialDays: Int
          $test: Boolean
          $lineItems: [AppSubscriptionLineItemInput!]!
        ) {
          appSubscriptionCreate(
            name: $name
            returnUrl: $returnUrl
            trialDays: $trialDays
            test: $test
            lineItems: $lineItems
          ) {
            appSubscription {
              id
              name
              status
              trialDays
            }
            confirmationUrl
            userErrors {
              field
              message
            }
          }
        }
      `,
      variables: {
        name: `FeedBuilderly ${plan.displayName} Plan`,
        returnUrl: `https://${process.env.HOST}/billing/callback?shop=${shop}&plan=${planName}`,
        trialDays: 14,
        test: process.env.NODE_ENV !== "production", // Test mode for dev
        lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                price: {
                  amount: plan.price,
                  currencyCode: "USD",
                },
                interval: "EVERY_30_DAYS",
              },
            },
          },
        ],
      },
    },
  });

  const result = response.body as any;

  // Check for errors
  if (result.data.appSubscriptionCreate.userErrors.length > 0) {
    const error = result.data.appSubscriptionCreate.userErrors[0];
    throw new Error(`Shopify billing error: ${error.message}`);
  }

  const confirmationUrl = result.data.appSubscriptionCreate.confirmationUrl;
  const chargeId = result.data.appSubscriptionCreate.appSubscription.id;

  console.log(`✅ Created subscription charge for ${shop}: ${chargeId}`);

  return { confirmationUrl, chargeId };
}
```

### 3.2 Добавить проверку активной подписки

Добавь метод для проверки статуса через Shopify API:

```typescript
// Verify subscription status with Shopify
async verifySubscription(shop: string, chargeId: string): Promise<boolean> {
  const session = sessionStorage.getSession(shop);
  if (!session) return false;

  try {
    const { shopifyApi } = await import("@shopify/shopify-api");
    const client = new shopifyApi.clients.Graphql({
      session: {
        shop: session.shop,
        accessToken: session.accessToken,
      },
    });

    const response = await client.query({
      data: {
        query: `
          query {
            currentAppInstallation {
              activeSubscriptions {
                id
                name
                status
                trialDays
                currentPeriodEnd
              }
            }
          }
        `,
      },
    });

    const result = response.body as any;
    const subscriptions = result.data.currentAppInstallation.activeSubscriptions;

    // Check if chargeId is in active subscriptions
    return subscriptions.some((sub: any) => 
      sub.id === chargeId && sub.status === "ACTIVE"
    );
  } catch (error) {
    console.error("Error verifying subscription:", error);
    return false;
  }
}
```

---

## 🧪 Шаг 4: Тестирование

### 4.1 Test Mode (Development)

При `test: true` в GraphQL запросе:
- Shopify **не снимает реальные деньги**
- Подписка помечается как "test"
- Идеально для разработки

### 4.2 Тестовый магазин

1. Создай **Development Store** в Partners Dashboard
2. Установи приложение на него
3. Попробуй создать подписку
4. Shopify покажет тестовую карту: `1` для успеха, `2` для отказа

### 4.3 Проверка после deployment

```bash
# 1. Установи приложение
curl "https://feedbuilder.fly.dev/install?shop=test-store.myshopify.com"

# 2. Открой страницу тарифов
open "https://feedbuilder.fly.dev/billing/pricing?shop=test-store.myshopify.com"

# 3. Выбери план → должен перенаправить в Shopify
# 4. Подтверди в Shopify → вернется на callback
# 5. Проверь статус

curl "https://feedbuilder.fly.dev/billing/subscription?shop=test-store.myshopify.com"
```

---

## 🔄 Шаг 5: Webhook для отмены подписки

Когда пользователь отменяет подписку через Shopify Admin, нужно обработать это.

### 5.1 Зарегистрируй webhook в Shopify

В `src/shopify.ts` добавь:

```typescript
export const shopify = shopifyApp({
  // ... existing config
  webhooks: {
    path: "/webhooks",
  },
});

// Register billing webhooks
shopify.webhooks.addHandlers({
  APP_SUBSCRIPTIONS_UPDATE: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/webhooks/billing",
    callback: async (topic, shop, body) => {
      console.log(`📱 Subscription update for ${shop}`);
      const data = JSON.parse(body);
      
      // Update subscription status in database
      if (data.app_subscription.status === "CANCELLED") {
        billingService.cancelSubscription(shop);
      }
    },
  },
});
```

### 5.2 Создай endpoint для webhook

```typescript
// src/routes/billing.ts
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const hmac = req.get("X-Shopify-Hmac-Sha256");
    const shop = req.get("X-Shopify-Shop-Domain");
    
    // Verify webhook (важно для безопасности!)
    // ... validation logic
    
    const payload = JSON.parse(req.body.toString());
    
    if (payload.status === "CANCELLED") {
      billingService.cancelSubscription(shop);
      console.log(`❌ Cancelled subscription for ${shop}`);
    }
    
    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).send("Error");
  }
});
```

---

## 📊 Шаг 6: Метрики и мониторинг

### 6.1 Отслеживай конверсию

Добавь логирование ключевых событий:
- ✅ Установка приложения
- ✅ Просмотр страницы тарифов
- ✅ Клик на "Choose Plan"
- ✅ Успешная активация подписки
- ✅ Отмена подписки

### 6.2 Dashboard с метриками

В `/status` уже показывается MRR/ARR. Можно добавить:
- Conversion rate (установки → подписки)
- Churn rate (отмены)
- LTV (lifetime value)

---

## ⚠️ Важные замечания

### Безопасность
1. **Всегда проверяй HMAC** webhooks от Shopify
2. **Храни API ключи** только в env variables
3. **Проверяй subscription status** перед предоставлением доступа

### Compliance
1. **GDPR**: Удаляй данные при uninstall
2. **Shopify App Store Requirements**: Должен работать free trial
3. **Refunds**: Через Shopify Partner Dashboard

### Pricing Strategy
- **14-day free trial** - стандарт для Shopify apps
- **Monthly billing** - самый популярный
- **Annual billing** - можно предложить скидку (например, 10 месяцев по цене годовой)

---

## 🚀 Checklist перед запуском

- [ ] Scopes обновлены в Partners Dashboard
- [ ] `.env` файл обновлен с новыми scopes
- [ ] Приложение переустановлено на тестовом магазине
- [ ] Billing API реализован (не мок)
- [ ] Тестовая подписка создана успешно
- [ ] Webhook для отмены настроен
- [ ] Страница /pricing открывается корректно
- [ ] Free trial работает
- [ ] Проверка ограничений работает
- [ ] Логи мониторятся

---

## 📚 Полезные ресурсы

- [Shopify Billing API Docs](https://shopify.dev/docs/apps/billing)
- [App Subscriptions GraphQL](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appSubscriptionCreate)
- [Testing Billing](https://shopify.dev/docs/apps/billing/testing)
- [Webhooks для billing](https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks)

---

## 💡 Следующие шаги для улучшения

1. **Usage-based billing** - платить за количество товаров или запросов
2. **Annual plans** - с discount 15-20%
3. **Enterprise custom pricing** - для больших клиентов
4. **Affiliate program** - 20% комиссия за рефералов
5. **Analytics dashboard** - для пользователей показывать статистику использования

---

Готов внедрять? Начинай с обновления scopes и тестирования на dev store! 🚀

