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
   stayType: string;
   currentAccommodationNights?: number | null;
};

export default function ChargesList({
  charges,
  stayType,
  currentAccommodationNights,
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
          {charges.map((charge) => {
          const isCurrentAccommodation =
        charge.category === "Accommodation" &&
        stayType === "Overnight" &&
        currentAccommodationNights != null;

      const displayQuantity = isCurrentAccommodation
        ? currentAccommodationNights
        : charge.quantity;

      const displayTotal = isCurrentAccommodation
        ? displayQuantity * Number(charge.unit_price)
        : Number(charge.total);

          return (
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
                    ? stayType === "Short Rest"
                      ? `Short Rest × ₦${Number(
                          charge.unit_price
                        ).toLocaleString()}`
                      : `${displayQuantity} ${
                          displayQuantity === 1 ? "night" : "nights"
                        } × ₦${Number(
                          charge.unit_price
                        ).toLocaleString()}/night`
                    : `${charge.category} · Qty: ${charge.quantity}`}
                </p>
              </div>

              <p className="font-semibold">
                ₦{displayTotal.toLocaleString()}
              </p>
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
}