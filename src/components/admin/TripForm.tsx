type TripFormValues = {
  title: string;
  slug: string;
  category: string;
  date: string;
  endDate: string;
  description: string;
};

export default function TripForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  defaultValues?: Partial<TripFormValues>;
  submitLabel: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-4 max-w-lg">
      <label className="flex flex-col gap-1 text-xs uppercase tracking-wide">
        Title
        <input
          name="title"
          required
          defaultValue={defaultValues?.title}
          className="border border-black/20 px-3 py-2 text-sm normal-case outline-none focus:border-black"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs uppercase tracking-wide">
        Slug (optional, auto from title)
        <input
          name="slug"
          defaultValue={defaultValues?.slug}
          placeholder="e.g. iceland-2025"
          className="border border-black/20 px-3 py-2 text-sm normal-case outline-none focus:border-black"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs uppercase tracking-wide">
        Category
        <input
          name="category"
          required
          defaultValue={defaultValues?.category}
          placeholder="e.g. Trips, Friends, Concerts"
          className="border border-black/20 px-3 py-2 text-sm normal-case outline-none focus:border-black"
        />
      </label>

      <div className="flex gap-4">
        <label className="flex flex-col gap-1 text-xs uppercase tracking-wide flex-1">
          Date
          <input
            type="date"
            name="date"
            required
            defaultValue={defaultValues?.date}
            className="border border-black/20 px-3 py-2 text-sm outline-none focus:border-black"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs uppercase tracking-wide flex-1">
          End date (optional)
          <input
            type="date"
            name="endDate"
            defaultValue={defaultValues?.endDate}
            className="border border-black/20 px-3 py-2 text-sm outline-none focus:border-black"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-xs uppercase tracking-wide">
        Description (optional)
        <textarea
          name="description"
          rows={3}
          defaultValue={defaultValues?.description}
          className="border border-black/20 px-3 py-2 text-sm normal-case outline-none focus:border-black resize-none"
        />
      </label>

      <button
        type="submit"
        className="bg-black text-white text-xs uppercase tracking-wide py-2 hover:opacity-80 self-start px-6"
      >
        {submitLabel}
      </button>
    </form>
  );
}
