export const feedRoutes = (app) => {
    app.get("/feed/:id.xml", async (req, res) => {
        const id = req.params.id;
        const xml = `<offers><o id="${id}" price="9.99"><name>Sample</name></o></offers>`;
        res.type("application/xml").send(xml);
    });
};
