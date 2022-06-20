const supertest = require("supertest");

const walletId = "kkarda.near";
const fileId = "e27fbbec-cb20-4d03-a0b4-b662a2821d26";
const Authorization = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb3VudHJ5Q29kZSI6Iis5MSIsImxhc3ROYW1lIjoia2FyZGEiLCJ1c2VySWQiOiJQaGMxTnlpX3RDSjdQdC1wSzNYVVoiLCJzdGF0dXMiOiJhY3RpdmUiLCJjcmVhdGVkIjoxNjQ3MjM4NDA4NTEzLCJpc1Bob25lVmVyaWZpZWQiOmZhbHNlLCJwaG9uZSI6Ijc1ODE4NDI1NjciLCJmaXJzdE5hbWUiOiJrYXBpbCIsImlzRW1haWxWZXJpZmllZCI6ZmFsc2UsIndhbGxldE5hbWUiOiJrYXBpbDAwNy5uZWFyIiwiaWF0IjoxNjQ3MjM4NDk0LCJleHAiOjE2NDczMjQ4OTR9.iLosl1J8RdIOkoOHRH8XYHKZNtGRsd0EDxSbvOnrj1s";
const APP_URL = "https://api.dev.nearlogin.io";

describe("Accept share test", () => {
    it("Should Accept share file", async () => {
        const {status, body: {data, message}} = await supertest(APP_URL)
            .post("/wallets/{walletId}/files/{fileId}/copy")
            .auth(Authorization)

        console.log(message, data);
        expect(status).toEqual(201);
    })
});