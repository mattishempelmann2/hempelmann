import TripForm from "@/components/admin/TripForm";
import { createTrip } from "../../actions";

export default function NewTripPage() {
  return (
    <div className="max-w-lg mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold">New trip</h1>
      <TripForm action={createTrip} submitLabel="Create trip" />
    </div>
  );
}
