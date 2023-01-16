const createResponse = (statusCode: number, message?: string) => ({
    statusCode,
    body: message
});

export const badRequest = (message: string) => createResponse(400, message);

export const ok = (message?: string) => createResponse(200, message);

export const serverError = (message: string) => createResponse(500, message);