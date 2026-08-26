type BillingSummaryProps = {
  totalCharges: number;
  totalPaid: number;
  balance: number;
  paymentStatus: string;
};

export default function BillingSummary({
  totalCharges,
  totalPaid,
  balance,
  paymentStatus,
}: BillingSummaryProps) {
  return (
    <>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow">
          <p className="text-sm text-gray-500">
            Total Charges
          </p>

          <p className="mt-2 text-2xl font-bold">
            ₦{totalCharges.toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <p className="text-sm text-gray-500">
            Total Paid
          </p>

          <p className="mt-2 text-2xl font-bold text-green-600">
            ₦{totalPaid.toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <p className="text-sm text-gray-500">
            Balance
          </p>

          <p className="mt-2 text-2xl font-bold text-red-600">
            ₦{balance.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">
          Payment Status
        </h2>

        <p className="mt-2 font-medium">
          {paymentStatus}
        </p>
      </div>
    </>
  );
}