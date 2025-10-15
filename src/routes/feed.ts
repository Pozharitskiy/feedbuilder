import type { Request, Response } from "express";

export const feedRoutes = (app: any) => {
  app.get("/feed/:id.xml", async (req: Request, res: Response) => {
    const id = req.params.id;
    const xml = `<offers><o id="${id}" price="9.99"><name>Sample</name></o></offers>`;
    res.type("application/xml").send(xml);
  });
};
