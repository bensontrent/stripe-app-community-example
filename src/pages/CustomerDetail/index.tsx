// src/pages/CustomerDetail/index.tsx
//
// The `customer` route (`/customers/:customerId`): the "detail" half of a
// list-to-detail flow. Its invoice table navigates one level deeper
// (`invoice` route) on row click, and the breadcrumb links back to the list.
//
// Ids that aren't in the mock data set get a real page too. The drawer
// deep-links here with the id of whichever Stripe customer it was opened on,
// so this page shows how to hand such a user over to the native Dashboard
// page with a route descriptor instead of dead-ending them.

import { useNavigation } from "@stripe/ui-extension-sdk/navigation";
import {
  Badge,
  Box,
  Button,
  DataTable,
  DetailPage,
  PageModule,
  PropertyList,
  PropertyListItem,
} from "@stripe/ui-extension-sdk/ui";
import { findCustomer, invoicesForCustomer } from "../../data/mock";
import { homeRoute } from "../Home/tabs";

type CustomerDetailProps = {
  customerId: string;
};

export function CustomerDetail({ customerId }: CustomerDetailProps) {
  const { createAppRoute, navigateToAppRoute } = useNavigation();
  const customer = findCustomer(customerId);

  const breadcrumbs = [
    {
      type: "link" as const,
      label: "Routing examples",
      route: createAppRoute(homeRoute("routing")),
    },
  ];

  if (!customer) {
    return (
      <DetailPage
        title="Customer not in the demo data"
        description={customerId}
        breadcrumbs={breadcrumbs}
        primaryColumn={
          <PageModule title="Not a mock customer">
            <Box css={{ stack: "y", gap: "medium" }}>
              <Box css={{ color: "secondary", font: "caption" }}>
                This route only knows the three customers in src/data/mock.ts.
                The id in the URL is probably a real Stripe customer (the
                drawer links here from customer pages), so send the user to
                the Dashboard page for it. A route descriptor keeps them in
                the same mode and session.
              </Box>
              <Box>
                <Button
                  type="primary"
                  href={{ name: "customerDetails", params: { customerId } }}
                >
                  Open this customer in the Dashboard
                </Button>
              </Box>
            </Box>
          </PageModule>
        }
      />
    );
  }

  const invoices = invoicesForCustomer(customer.id).map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    amount: invoice.amount,
    currency: invoice.currency.toUpperCase(),
    status: invoice.status,
    created: invoice.created,
  }));

  return (
    <DetailPage
      title={customer.name}
      description={customer.email}
      breadcrumbs={breadcrumbs}
      primaryColumn={
        <PageModule
          title="Invoices"
          subtitle="Click a row to open /customers/:customerId/invoices/:invoiceId"
        >
          <DataTable
            columns={[
              { key: "number", label: "Number" },
              {
                key: "amount",
                label: "Amount",
                cell: { type: "currency", currency: "USD", currencyKey: "currency" },
              },
              {
                key: "status",
                label: "Status",
                cell: {
                  type: "status",
                  statusMap: { paid: "positive", open: "info", void: "neutral" },
                },
              },
              {
                key: "created",
                label: "Created",
                cell: { type: "date", options: { style: "medium-year-month-day" } },
              },
            ]}
            items={invoices}
            onRowClick={(item) =>
              navigateToAppRoute({
                key: "invoice",
                params: { customerId: customer.id, invoiceId: String(item.id) },
              })
            }
            emptyMessage="No invoices for this customer."
          />
        </PageModule>
      }
      secondaryColumn={
        <PageModule title="Details">
          <PropertyList>
            <PropertyListItem label="ID" value={customer.id} />
            <PropertyListItem label="Email" value={customer.email} />
            <PropertyListItem label="Country" value={customer.country} />
            <PropertyListItem
              label="Status"
              value={
                <Badge type={customer.status === "active" ? "positive" : "warning"}>
                  {customer.status}
                </Badge>
              }
            />
            <PropertyListItem label="Route" value="/customers/:customerId" />
          </PropertyList>
        </PageModule>
      }
    />
  );
}
