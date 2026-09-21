// src/pages/InvoiceDetail/index.tsx
//
// The `invoice` route (`/customers/:customerId/invoices/:invoiceId`): two
// required parameters, both typed as `string` straight from the pattern.
// Breadcrumbs walk back up the hierarchy (list → customer), and the
// previous/next links show declarative navigation between sibling params.

import { useNavigation } from "@stripe/ui-extension-sdk/navigation";
import {
  Badge,
  Box,
  DetailPage,
  Link,
  PageModule,
  PropertyList,
  PropertyListItem,
} from "@stripe/ui-extension-sdk/ui";
import { findCustomer, findInvoice, invoicesForCustomer } from "../../data/mock";
import { homeRoute } from "../Home/tabs";

const formatAmount = (amount: number, currency: string) =>
  new Intl.NumberFormat("en", { style: "currency", currency }).format(
    amount / 100,
  );

type InvoiceDetailProps = {
  customerId: string;
  invoiceId: string;
};

export function InvoiceDetail({ customerId, invoiceId }: InvoiceDetailProps) {
  const { createAppRoute } = useNavigation();
  const customer = findCustomer(customerId);
  const invoice = findInvoice(customerId, invoiceId);

  const breadcrumbs = [
    {
      type: "link" as const,
      label: "Routing examples",
      route: createAppRoute(homeRoute("routing")),
    },
    {
      type: "link" as const,
      label: customer?.name ?? customerId,
      route: createAppRoute({ key: "customer", params: { customerId } }),
    },
  ];

  if (!customer || !invoice) {
    return (
      <DetailPage
        title="Invoice not found"
        description={`${customerId} / ${invoiceId}`}
        breadcrumbs={breadcrumbs}
        primaryColumn={
          <PageModule title="Unknown invoice">
            <Box css={{ stack: "y", gap: "small" }}>
              <Box>
                Both parameters matched the pattern, but the data layer has
                no such invoice for this customer. Validate params on the
                page, not in the route config.
              </Box>
              <Link
                href={createAppRoute({ key: "customer", params: { customerId } })}
              >
                Back to the customer
              </Link>
            </Box>
          </PageModule>
        }
      />
    );
  }

  const siblings = invoicesForCustomer(customer.id);
  const index = siblings.findIndex((item) => item.id === invoice.id);
  const previous = siblings[index - 1];
  const next = siblings[index + 1];

  return (
    <DetailPage
      title={`Invoice ${invoice.number}`}
      description={customer.name}
      breadcrumbs={breadcrumbs}
      primaryColumn={
        <PageModule title="Summary">
          <PropertyList>
            <PropertyListItem
              label="Amount"
              value={formatAmount(invoice.amount, invoice.currency)}
            />
            <PropertyListItem
              label="Status"
              value={
                <Badge
                  type={
                    invoice.status === "paid"
                      ? "positive"
                      : invoice.status === "open"
                        ? "info"
                        : "neutral"
                  }
                >
                  {invoice.status}
                </Badge>
              }
            />
            <PropertyListItem label="Created" value={invoice.created} />
            <PropertyListItem label="Invoice ID" value={invoice.id} />
            <PropertyListItem label="Customer ID" value={customer.id} />
          </PropertyList>
        </PageModule>
      }
      secondaryColumn={
        <PageModule
          title="Siblings"
          subtitle="Same route, different :invoiceId"
        >
          <Box css={{ stack: "y", gap: "small" }}>
            {previous ? (
              <Link
                href={createAppRoute({
                  key: "invoice",
                  params: { customerId: customer.id, invoiceId: previous.id },
                })}
              >
                ← {previous.number}
              </Link>
            ) : (
              <Box css={{ color: "secondary", font: "caption" }}>
                No previous invoice
              </Box>
            )}
            {next ? (
              <Link
                href={createAppRoute({
                  key: "invoice",
                  params: { customerId: customer.id, invoiceId: next.id },
                })}
              >
                {next.number} →
              </Link>
            ) : (
              <Box css={{ color: "secondary", font: "caption" }}>
                No next invoice
              </Box>
            )}
          </Box>
        </PageModule>
      }
    />
  );
}
