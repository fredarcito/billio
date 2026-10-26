import { Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatMoney, monthName } from "@/lib/format";

const statusMap = {
  sent: { label: "Enviada", variant: "success" },
  pending: { label: "Pendiente", variant: "warning" },
  failed: { label: "Fallida", variant: "destructive" },
};

const sourceMap = {
  manual: "Manual",
  cron: "Automática",
};

// Tabla de historial de facturas (componente de servidor)
export function InvoiceHistory({ invoices, emptyMessage = "No hay facturas todavía." }) {
  if (!invoices || invoices.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Emitida</TableHead>
              <TableHead>Periodo</TableHead>
              <TableHead>Destinatario</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="pr-6 text-right">PDF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => {
              const status = statusMap[invoice.status] || {
                label: invoice.status,
                variant: "outline",
              };
              return (
                <TableRow key={invoice.id}>
                  <TableCell className="pl-6 whitespace-nowrap text-muted-foreground">
                    {formatDate(invoice.issuedAt)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-medium">
                    {monthName(invoice.month)} {invoice.year}
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate">{invoice.recipientEmail}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {invoice.description}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-medium">
                    {formatMoney(invoice.amount, invoice.currency)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {sourceMap[invoice.source] || invoice.source}
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant} title={invoice.error || undefined}>
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <Button asChild variant="ghost" size="icon" title="Descargar PDF">
                      <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
                        <Download />
                        <span className="sr-only">Descargar PDF</span>
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
