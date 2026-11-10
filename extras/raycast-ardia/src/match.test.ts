import assert from "node:assert/strict";
import { test } from "node:test";
import { fold, rank, wordStartMatch } from "./match.ts";

type Row = { title: string; host: string };
const titles = (rows: Row[]) => rows.map((row) => row.title);
const search = (rows: Row[], query: string) => {
  const { matches, others } = rank(rows, query, (row) => row);
  return { matches: titles(matches), others: titles(others) };
};

test("an empty query keeps every tab in sidebar order", () => {
  const rows = [
    { title: "B", host: "b.com" },
    { title: "A", host: "a.com" },
  ];
  assert.deepEqual(search(rows, "  "), { matches: ["B", "A"], others: [] });
});

test("ranks title start, then title word start, then inside the title, then the host", () => {
  const rows = [
    { title: "Products - All", host: "admin.shopify.com" },
    { title: "Shop Opt-in Leads", host: "docs.google.com" },
    { title: "Overview - Google Ads", host: "ads.google.com" },
    { title: "Ads Manager", host: "adsmanager.facebook.com" },
    { title: "Spreadsheet", host: "docs.google.com" },
  ];
  assert.deepEqual(search(rows, "ads"), {
    matches: ["Ads Manager", "Overview - Google Ads", "Shop Opt-in Leads", "Spreadsheet"],
    others: [],
  });
  assert.deepEqual(search(rows, "shopify").matches, ["Products - All"]);
});

test("keeps sidebar order among tabs of the same rank", () => {
  const rows = [
    { title: "PayPal: Summary", host: "paypal.com" },
    { title: "Orders", host: "admin.shopify.com" },
    { title: "PayPal: Activities", host: "paypal.com" },
  ];
  assert.deepEqual(search(rows, "PayPal").matches, ["PayPal: Summary", "PayPal: Activities"]);
});

test("never matches letters scattered through a title or the address", () => {
  const rows = [
    { title: "Growth - Autopilot", host: "app.example.com" },
    { title: "Products - All", host: "admin.shopify.com" },
  ];
  assert.deepEqual(search(rows, "git"), { matches: [], others: [] });
  assert.deepEqual(search(rows, "paypal"), { matches: [], others: [] });
});

test("finds every typed word when the words are apart", () => {
  const rows = [
    { title: "Google Ads how it works", host: "support.google.com" },
    { title: "Ads Manager", host: "facebook.com" },
  ];
  assert.deepEqual(search(rows, "works google").matches, ["Google Ads how it works"]);
});

test("puts letters that start the title's words after the real matches, tightest and earliest first", () => {
  const rows = [
    { title: "Shopify Conversions to Google Ads", host: "help.shopify.com" },
    { title: "Google Ads how it works", host: "support.google.com" },
    { title: "GADS export", host: "example.com" },
  ];
  assert.deepEqual(search(rows, "gads"), {
    matches: ["GADS export"],
    others: ["Google Ads how it works", "Shopify Conversions to Google Ads"],
  });
});

test("needs at least two letters before matching word starts", () => {
  const rows = [{ title: "Google Ads", host: "ads.google.com" }];
  assert.deepEqual(search(rows, "x"), { matches: [], others: [] });
});

test("word starts may continue into the word and must stay in order", () => {
  assert.deepEqual(wordStartMatch("gat", ["ga4", "vs", "google", "ads", "tracking"]), { first: 2, span: 2 });
  assert.deepEqual(wordStartMatch("goads", ["google", "ads"]), { first: 0, span: 1 });
  assert.equal(wordStartMatch("adgo", ["google", "ads"]), undefined);
  assert.deepEqual(wordStartMatch("sms", ["paypal", "send", "money", "success"]), { first: 1, span: 2 });
});

test("folds case and accents", () => {
  assert.equal(fold("Café ÉLAN"), "cafe elan");
  assert.deepEqual(search([{ title: "Café Menu", host: "example.com" }], "cafe").matches, ["Café Menu"]);
});
