import type { Category } from '../types/catalog';

type Props = {
  categories: Category[];
  selected: string | undefined;
  onSelect: (slug: string | undefined) => void;
  isLoading: boolean;
};

export default function CategoryFilter({ categories, selected, onSelect, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-7 animate-pulse rounded-md bg-slate-100" />
        ))}
      </div>
    );
  }

  const rowClass = (isActive: boolean) =>
    `flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
      isActive ? 'bg-brand-50 font-semibold text-brand-700' : 'text-ink-700 hover:bg-slate-100'
    }`;

  return (
    <nav aria-label="Product categories" className="space-y-1">
      <button type="button" onClick={() => onSelect(undefined)} className={rowClass(!selected)}>
        All products
      </button>

      {categories.map((parent) => (
        <div key={parent.id}>
          <button
            type="button"
            onClick={() => onSelect(parent.slug)}
            className={rowClass(selected === parent.slug)}
          >
            <span>{parent.name}</span>
            <span className="text-xs text-ink-500">{parent.productCount}</span>
          </button>

          {parent.children.length > 0 && (
            <div className="ml-3 border-l border-slate-200 pl-2">
              {parent.children.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => onSelect(child.slug)}
                  className={rowClass(selected === child.slug)}
                >
                  <span>{child.name}</span>
                  <span className="text-xs text-ink-500">{child.productCount}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
