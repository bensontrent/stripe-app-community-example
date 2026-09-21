// src/data/mock.ts
//
// A tiny in-memory data set for the list-to-detail routing examples
// (/customers/:customerId and /customers/:customerId/invoices/:invoiceId).
// It stands in for whatever your app would fetch from its backend or from
// the Stripe API; the routing code doesn't care where the rows come from.

export type MockCustomer = {
  id: string;
  name: string;
  email: string;
  country: string;
  status: "active" | "delinquent";
};

export type MockInvoice = {
  id: string;
  customerId: string;
  number: string;
  /** Minor units, like the Stripe API. */
  amount: number;
  currency: string;
  status: "paid" | "open" | "void";
  /** ISO 8601 timestamp. */
  created: string;
};

export const CUSTOMERS: readonly MockCustomer[] = [
  {
    id: "cus_demo_acme",
    name: "Acme Robotics",
    email: "billing@acme.example",
    country: "US",
    status: "active",
  },
  {
    id: "cus_demo_globex",
    name: "Globex Logistics",
    email: "ap@globex.example",
    country: "DE",
    status: "active",
  },
  {
    id: "cus_demo_initech",
    name: "Initech Software",
    email: "finance@initech.example",
    country: "GB",
    status: "delinquent",
  },
];

export const INVOICES: readonly MockInvoice[] = [
  {
    id: "in_demo_acme_001",
    customerId: "cus_demo_acme",
    number: "ACME-0001",
    amount: 129900,
    currency: "usd",
    status: "paid",
    created: "2026-07-02T09:30:00Z",
  },
  {
    id: "in_demo_acme_002",
    customerId: "cus_demo_acme",
    number: "ACME-0002",
    amount: 129900,
    currency: "usd",
    status: "open",
    created: "2026-08-02T09:30:00Z",
  },
  {
    id: "in_demo_globex_001",
    customerId: "cus_demo_globex",
    number: "GLBX-0001",
    amount: 48000,
    currency: "eur",
    status: "paid",
    created: "2026-06-15T14:05:00Z",
  },
  {
    id: "in_demo_globex_002",
    customerId: "cus_demo_globex",
    number: "GLBX-0002",
    amount: 48000,
    currency: "eur",
    status: "void",
    created: "2026-07-15T14:05:00Z",
  },
  {
    id: "in_demo_globex_003",
    customerId: "cus_demo_globex",
    number: "GLBX-0003",
    amount: 52000,
    currency: "eur",
    status: "open",
    created: "2026-08-15T14:05:00Z",
  },
  {
    id: "in_demo_initech_001",
    customerId: "cus_demo_initech",
    number: "INTC-0001",
    amount: 7500,
    currency: "gbp",
    status: "open",
    created: "2026-05-20T11:00:00Z",
  },
];

export const findCustomer = (id: string): MockCustomer | undefined =>
  CUSTOMERS.find((customer) => customer.id === id);

export const invoicesForCustomer = (customerId: string): MockInvoice[] =>
  INVOICES.filter((invoice) => invoice.customerId === customerId);

export const findInvoice = (
  customerId: string,
  invoiceId: string,
): MockInvoice | undefined =>
  INVOICES.find(
    (invoice) => invoice.customerId === customerId && invoice.id === invoiceId,
  );
