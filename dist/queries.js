export const PRODUCTS_QUERY = `
query Products($cursor: String) {
  products(first: 250, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    edges {
      node {
        id
        title
        handle
        vendor
        productType
        status
        tags
        description
        images(first: 1) { edges { node { url } } }
        variants(first: 50) {
          edges {
            node {
              id
              title
              sku
              barcode
              price
              inventoryQuantity
              weight
              weightUnit
            }
          }
        }
      }
    }
  }
}
`;
