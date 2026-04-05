// регистрация маршрутов
import express from 'express';


export interface IRoute {
    method: 'GET' | 'POST';
    path: string;
    handler: express.RequestHandler;
}

export function registerRoutes(app: express.Application, routes: IRoute[]) {
    for (const route of routes) {
        if (route.method === 'GET') {
            app.get(route.path, route.handler);
        } else if (route.method === 'POST') {
            app.post(route.path, route.handler);
        } 
    }
}
