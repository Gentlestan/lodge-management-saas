
type Payment = {
  id: number;
  amount: string;
  payment_method: string;
  reference: string;
  notes: string;
  created_at: string;
};

type PaymentsListProps = {
  payments: Payment[];
};

export default function PaymentsList({
  payments,
}: PaymentsListProps) {
  return (
    <div className="mt-6 rounded-xl bg-white p-6 shadow">
      <h2 className="mb-4 text-xl font-semibold">
        Payments
      </h2>

      {payments.length === 0 ? (
        <p className="text-gray-500">
          No payments recorded.
        </p>
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between border-b pb-3"
            >
              <div>
                <p className="font-medium">
                  {payment.notes || "Payment"}
                </p>

                <p className="text-sm text-gray-500">
                  {payment.payment_method}
                  {payment.reference
                    ? ` · ${payment.reference}`
                    : ""}
                </p>
              </div>

              <p className="font-semibold text-green-600">
                ₦{Number(payment.amount).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
