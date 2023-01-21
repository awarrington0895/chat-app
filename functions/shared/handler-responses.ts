export interface HandlerResponse {
    readonly statusCode: number
    readonly body?: string;
}

const createResponse = (statusCode: number, message?: string): HandlerResponse => ({
    statusCode,
    body: message
});

export const badRequest = (message: string) => createResponse(400, message);

export const ok = (message?: string) => createResponse(200, message);

export const serverError = (message: string) => createResponse(500, message);