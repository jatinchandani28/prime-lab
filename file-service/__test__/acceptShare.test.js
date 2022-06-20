const supertest = require("supertest");

const walletId = "kkarda.near";
const fileId = "e27fbbec-cb20-4d03-a0b4-b662a2821d26";
const Authorization = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJCc3AxMnoxSk5NV3JZNWhJTnhZdHIiLCJmaXJzdE5hbWUiOiJ0ZXN0IiwibGFzdE5hbWUiOiJ1c2VyIiwid2FsbGV0SWQiOiI0ak14dFdzVFlCMWgzMWFfVUpwdlUiLCJlbWFpbCI6Im1vY2stdGVzdEBwcmltZWxhYi5pbyIsInBob25lIjoiKzI1NTE4MTcxODEiLCJkb2IiOiIyMDAwLTEwLTEwIiwiaWF0IjoxNjQ2MTgzNjgxLCJleHAiOjIyNTA5ODM2ODF9.IPFo12Qlw1SUHVM6_TNeC4J-5-WzFb0JkqVbdYNAr-o";
const APP_URL = "https://api.dev.nearlogin.io";

describe("Accept share test", () => {
    it("Should Accept share file", async () => {
        const {status, body: {data, message}} = await supertest(APP_URL)
            .post("/wallets/:walletId/files/:fileId/accept")
            .auth(Authorization)

        console.log(message, data);
        expect(status).toEqual(201);
    })
});