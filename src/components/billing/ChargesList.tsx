type Charge = {
  id: number;
  category: string;
  description: string;
  quantity: number;
  unit_price: string;
  total: number;
  created_at: string;
};

type ChargesListProps = {
  charges: Charge[];
};

export default function ChargesList({
  charges,
}: ChargesListProps) {
  return (
    <div className="mt-6 rounded-xl bg-white p-6 shadow">
      <h2 className="mb-4 text-xl font-semibold">
        Charges
      </h2>

      {charges.length === 0 ? (
        <p className="text-gray-500">
          No charges recorded.
        </p>
      ) : (
        <div className="space-y-3">
          {charges.map((charge) => (
            <div
              key={charge.id}
              className="flex items-center justify-between border-b pb-3"
            >
              <div>
                <p className="font-medium">
                  {charge.description}
                </p>

                <p className="text-sm text-gray-500">
                  {charge.category === "Accommodation"
                    ? `${charge.quantity} ${
                        charge.quantity === 1 ? "night" : "nights"
                      } × ₦${Number(
                        charge.unit_price
                      ).toLocaleString()}/night`
                    : `${charge.category} · Qty: ${charge.quantity}`}
                </p>
              </div>

              <p className="font-semibold">
                ₦{Number(charge.total).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}