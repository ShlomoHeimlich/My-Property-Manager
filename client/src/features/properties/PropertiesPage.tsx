import { useEffect, useState, type FormEvent } from "react";
import type { User } from "../../services/authApi";
import {
  propertyApi,
  type PropertyInput,
  type PropertyRecord,
  type PropertyTransaction,
} from "../../services/propertyApi";
import "./PropertiesPage.css";

type PropertiesPageProps = {
  user: User;
  onLogout: () => void;
  initialNotice?: string;
};

type CostDraft = { id: string; name: string; amount: string };
type TransactionDraft = {
  type: "income" | "expense";
  category: string;
  customCategory: string;
  description: string;
  amount: string;
  date: string;
};
type PropertyDraft = {
  name: string;
  address: string;
  city: string;
  apartmentPrice: string;
  additionalCosts: CostDraft[];
  purchaseDate: string;
  notes: string;
};

const EMPTY_DRAFT: PropertyDraft = {
  name: "",
  address: "",
  city: "",
  apartmentPrice: "",
  additionalCosts: [],
  purchaseDate: "",
  notes: "",
};

const EXPENSE_CATEGORIES = [
  { id: "electricity", label: "חשמל", color: "#e4a83b" },
  { id: "water", label: "מים", color: "#4386b8" },
  { id: "mortgage", label: "משכנתא", color: "#8759a5" },
  { id: "life_insurance", label: "ביטוח חיים", color: "#538d79" },
  { id: "property_insurance", label: "ביטוח נכס", color: "#c56b51" },
  { id: "management_fee", label: "דמי ניהול", color: "#6a7eaa" },
  { id: "arnona", label: "ארנונה", color: "#a27a45" },
  { id: "vaad_bayit", label: "ועד בית", color: "#508c8d" },
  { id: "other", label: "אחר", color: "#8b9290" },
];

const INCOME_CATEGORIES = [
  { id: "rent", label: "שכר דירה", color: "#2d7650" },
  { id: "other", label: "אחר", color: "#78a987" },
];

function categoryLabel(transaction: PropertyTransaction) {
  if (transaction.category === "other") {
    return transaction.customCategory || "אחר";
  }
  const categories =
    transaction.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return (
    categories.find((category) => category.id === transaction.category)
      ?.label ?? transaction.category
  );
}

function getPieSlices(
  transactions: PropertyTransaction[],
  type: "income" | "expense",
) {
  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const totals = new Map<
    string,
    { label: string; amount: number; color: string }
  >();
  for (const transaction of transactions.filter(
    (entry) => entry.type === type,
  )) {
    const matchedCategory = categories.find(
      (category) => category.id === transaction.category,
    );
    const label =
      transaction.category === "other"
        ? transaction.customCategory || "אחר"
        : (matchedCategory?.label ?? transaction.category);
    const key =
      transaction.category === "other"
        ? `other:${label}`
        : transaction.category;
    const existing = totals.get(key);
    totals.set(key, {
      label,
      amount: (existing?.amount ?? 0) + transaction.amount,
      color: matchedCategory?.color ?? "#8b9290",
    });
  }
  return [...totals.values()].filter((slice) => slice.amount > 0);
}

function pieGradient(slices: Array<{ amount: number; color: string }>) {
  const total = slices.reduce((sum, slice) => sum + slice.amount, 0);
  if (!total) return "conic-gradient(#e8ece8 0deg 360deg)";
  let currentAngle = 0;
  const stops = slices.map((slice) => {
    const start = currentAngle;
    currentAngle += (slice.amount / total) * 360;
    return `${slice.color} ${start}deg ${currentAngle}deg`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

function CategoryPie({
  title,
  type,
  slices,
}: {
  title: string;
  type: "income" | "expense";
  slices: Array<{ label: string; amount: number; color: string }>;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.amount, 0);

  return (
    <section className={`category-pie-panel ${type}`}>
      <h3>{title}</h3>
      {slices.length ? (
        <div className="category-pie-content">
          <div
            className="category-pie"
            style={{ background: pieGradient(slices) }}
            role="img"
            aria-label={`${title}: ${formatCurrency(total)}`}
          >
            <div className="category-pie-center">
              <span>סה״כ</span>
              <strong>{formatCurrency(total)}</strong>
            </div>
          </div>
          <ul className="category-pie-legend">
            {slices.map((slice) => (
              <li key={`${type}-${slice.label}`}>
                <span className="pie-legend-name">
                  <i style={{ backgroundColor: slice.color }} />
                  {slice.label}
                </span>
                <span className="pie-legend-value">
                  {formatCurrency(slice.amount)}
                  <small>{Math.round((slice.amount / total) * 100)}%</small>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="pie-empty">
          אין {type === "income" ? "הכנסות" : "הוצאות"} לשנה שנבחרה
        </p>
      )}
    </section>
  );
}

function propertyToDraft(property: PropertyRecord): PropertyDraft {
  return {
    name: property.name,
    address: property.address,
    city: property.city,
    apartmentPrice: property.apartmentPrice?.toString() ?? "",
    additionalCosts: (property.additionalCosts ?? []).map((cost) => ({
      id: cost.id,
      name: cost.name,
      amount: cost.amount.toString(),
    })),
    purchaseDate: property.purchaseDate,
    notes: property.notes,
  };
}

function toPropertyInput(draft: PropertyDraft): PropertyInput {
  return {
    ...draft,
    apartmentPrice: draft.apartmentPrice ? Number(draft.apartmentPrice) : null,
    additionalCosts: draft.additionalCosts.map((cost) => ({
      id: cost.id,
      name: cost.name.trim(),
      amount: Number(cost.amount),
    })),
  };
}

function formatCurrency(value: number | null) {
  if (value === null) return "לא צוין";
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 2,
  }).format(value);
}

function totalPropertyCost(
  property: Pick<PropertyRecord, "apartmentPrice" | "additionalCosts">,
) {
  const additionalTotal = (property.additionalCosts ?? []).reduce(
    (total, cost) => total + cost.amount,
    0,
  );
  if (property.apartmentPrice === null && additionalTotal === 0) return null;
  return (property.apartmentPrice ?? 0) + additionalTotal;
}

function statusLabel(status: PropertyRecord["status"]) {
  return status === "active" ? "פעיל" : status === "sold" ? "נמכר" : "בארכיון";
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function dateForMonth(month: string) {
  const today = getToday();
  return today.startsWith(`${month}-`) ? today : `${month}-01`;
}

function shiftMonth(month: string, amount: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("he-IL", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthNumber - 1, 1));
}

const INITIAL_MONTH = getCurrentMonth();
const INITIAL_DATE = getToday();
const INITIAL_YEAR = Number(INITIAL_MONTH.slice(0, 4));

export default function PropertiesPage({
  user,
  onLogout,
  initialNotice = "",
}: PropertiesPageProps) {
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [selected, setSelected] = useState<PropertyRecord | null>(null);
  const [draft, setDraft] = useState<PropertyDraft>(EMPTY_DRAFT);
  const [view, setView] = useState<"list" | "detail" | "form">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(initialNotice);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detailTab, setDetailTab] = useState<
    "monthly" | "summary" | "settings"
  >("monthly");
  const [selectedMonth, setSelectedMonth] = useState(INITIAL_MONTH);
  const [transactions, setTransactions] = useState<PropertyTransaction[]>([]);
  const [yearlyTransactions, setYearlyTransactions] = useState<
    PropertyTransaction[]
  >([]);
  const [summaryYear, setSummaryYear] = useState(INITIAL_YEAR);
  const [loadedSummaryKey, setLoadedSummaryKey] = useState<string | null>(null);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [loadedTransactionMonth, setLoadedTransactionMonth] = useState<
    string | null
  >(null);
  const [transactionSaving, setTransactionSaving] = useState(false);
  const [transactionDraft, setTransactionDraft] = useState<TransactionDraft>({
    type: "expense",
    category: "",
    customCategory: "",
    description: "",
    amount: "",
    date: INITIAL_DATE,
  });

  const selectedPropertyId = selected?.id;

  useEffect(() => {
    let isActive = true;
    propertyApi
      .list(includeInactive)
      .then((result) => {
        if (isActive) setProperties(result);
      })
      .catch((requestError: Error) => {
        if (isActive) setError(requestError.message);
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [includeInactive]);

  useEffect(() => {
    if (view !== "detail" || !selectedPropertyId) return;
    let isActive = true;
    propertyApi
      .monthlyTransactions(selectedPropertyId, selectedMonth)
      .then((result) => {
        if (isActive) {
          setTransactions(result);
          setLoadedTransactionMonth(selectedMonth);
        }
      })
      .catch((requestError: Error) => {
        if (isActive) {
          setTransactions([]);
          setLoadedTransactionMonth(selectedMonth);
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (isActive) setTransactionsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [selectedPropertyId, selectedMonth, view]);

  useEffect(() => {
    if (view !== "detail" || detailTab !== "summary" || !selectedPropertyId)
      return;
    let isActive = true;
    const summaryKey = `${selectedPropertyId}:${summaryYear}`;
    propertyApi
      .yearlyTransactions(selectedPropertyId, summaryYear)
      .then((result) => {
        if (isActive) {
          setYearlyTransactions(result);
          setLoadedSummaryKey(summaryKey);
        }
      })
      .catch((requestError: Error) => {
        if (isActive) {
          setYearlyTransactions([]);
          setLoadedSummaryKey(summaryKey);
          setError(requestError.message);
        }
      });

    return () => {
      isActive = false;
    };
  }, [selectedPropertyId, summaryYear, detailTab, view]);
  const summaryLoading =
    loadedSummaryKey !== `${selectedPropertyId}:${summaryYear}`;

  const visibleProperties = properties.filter((property) =>
    `${property.name} ${property.address} ${property.city}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const currentMonthTransactions =
    loadedTransactionMonth === selectedMonth ? transactions : [];
  const monthlyIncome = currentMonthTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const monthlyExpenses = currentMonthTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const monthlyResult = monthlyIncome - monthlyExpenses;
  const yearlyIncome = yearlyTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const yearlyExpenses = yearlyTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const yearlyIncomeSlices = getPieSlices(yearlyTransactions, "income");
  const yearlyExpenseSlices = getPieSlices(yearlyTransactions, "expense");
  const yearOptions = Array.from(
    { length: INITIAL_YEAR - 1999 },
    (_, index) => INITIAL_YEAR - index,
  );

  function selectMonth(month: string) {
    setSelectedMonth(month);
    setTransactionDraft((current) => ({
      ...current,
      date: dateForMonth(month),
    }));
  }

  function startCreate() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setError("");
    setView("form");
  }

  function startEdit(property: PropertyRecord) {
    setEditingId(property.id);
    setDraft(propertyToDraft(property));
    setError("");
    setView("form");
  }

  async function openDetails(property: PropertyRecord) {
    setLoading(true);
    setError("");
    try {
      setSelected(await propertyApi.get(property.id));
      setTransactions([]);
      setLoadedTransactionMonth(null);
      setDetailTab("monthly");
      setView("detail");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "לא ניתן לטעון את הנכס",
      );
    } finally {
      setLoading(false);
    }
  }

  async function addMonthlyTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setTransactionSaving(true);
    setError("");
    setNotice("");
    try {
      const transaction = await propertyApi.addTransaction(
        selected.id,
        {
          ...transactionDraft,
          amount: Number(transactionDraft.amount),
        },
        setNotice,
      );
      if (transaction.date.startsWith(`${selectedMonth}-`)) {
        setTransactions((current) =>
          [transaction, ...current].sort((left, right) =>
            right.date.localeCompare(left.date),
          ),
        );
        setLoadedTransactionMonth(selectedMonth);
      }
      setTransactionDraft({
        type: transactionDraft.type,
        category: "",
        customCategory: "",
        description: "",
        amount: "",
        date: dateForMonth(selectedMonth),
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "לא ניתן לשמור את התנועה",
      );
    } finally {
      setTransactionSaving(false);
    }
  }

  async function removeMonthlyTransaction(transactionId: string) {
    if (!selected) return;
    setError("");
    setNotice("");
    try {
      await propertyApi.deleteTransaction(
        selected.id,
        transactionId,
        setNotice,
      );
      setTransactions((current) =>
        current.filter((transaction) => transaction.id !== transactionId),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "לא ניתן למחוק את התנועה",
      );
    }
  }

  async function saveProperty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const input = toPropertyInput(draft);
      const saved = editingId
        ? await propertyApi.update(editingId, input, setNotice)
        : await propertyApi.create(input, setNotice);
      setSelected(saved);
      setProperties(await propertyApi.list(includeInactive));
      setView("detail");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "לא ניתן לשמור את הנכס",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="properties-app" dir="rtl">
      <header className="workspace-header">
        <a className="workspace-brand" href="/" aria-label="מנהל הנכסים">
          <span className="brand-mark">מ</span>
          <span>מנהל הנכסים</span>
        </a>
        <div className="account-menu">
          <span className="account-name">{user.name}</span>
          <button type="button" className="quiet-button" onClick={onLogout}>
            יציאה
          </button>
        </div>
      </header>

      <div className="properties-main">
        <div className="page-heading">
          <div>
            <p className="section-kicker">תיק הנכסים</p>
            <h1>
              {view === "list"
                ? "הנכסים שלי"
                : view === "detail"
                  ? selected?.name
                  : editingId
                    ? "עריכת נכס"
                    : "נכס חדש"}
            </h1>
          </div>
          {view === "list" && (
            <button
              className="primary-action"
              type="button"
              onClick={startCreate}
            >
              <span aria-hidden="true">＋</span> הוספת נכס
            </button>
          )}
          {view !== "list" && (
            <button
              className="quiet-button"
              type="button"
              onClick={() =>
                setView(
                  view === "form" && editingId && selected ? "detail" : "list",
                )
              }
            >
              חזרה{" "}
              {view === "detail" || (view === "form" && editingId && selected)
                ? "לפרטים"
                : "לרשימה"}
            </button>
          )}
        </div>

        {error && (
          <div className="property-alert" role="alert">
            {error}
          </div>
        )}
        {notice && (
          <div className="property-success" role="status" aria-live="polite">
            <span aria-hidden="true">✓</span>
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="סגירת הודעה"
            >
              ×
            </button>
          </div>
        )}

        {view === "list" && (
          <section className="property-list-view">
            <div className="list-toolbar">
              <label className="search-field">
                <span aria-hidden="true">⌕</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="חיפוש לפי שם, כתובת או עיר"
                  aria-label="חיפוש נכסים"
                />
              </label>
              <label className="checkbox-control">
                <input
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(event) => setIncludeInactive(event.target.checked)}
                />
                <span>כולל ארכיון ונמכרו</span>
              </label>
              <span className="result-count">
                {visibleProperties.length} נכסים
              </span>
            </div>

            {loading ? (
              <div className="empty-state">טוענים נכסים...</div>
            ) : visibleProperties.length ? (
              <div className="property-table-wrap">
                <table className="property-table">
                  <thead>
                    <tr>
                      <th>נכס</th>
                      <th>עלות כוללת</th>
                      <th>סטטוס</th>
                      <th>
                        <span className="sr-only">פעולות</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleProperties.map((property) => (
                      <tr key={property.id}>
                        <td>
                          <button
                            className="property-name-button"
                            type="button"
                            onClick={() => void openDetails(property)}
                          >
                            <strong>{property.name}</strong>
                            <span>
                              {property.address}, {property.city}
                            </span>
                          </button>
                        </td>
                        <td>{formatCurrency(totalPropertyCost(property))}</td>
                        <td>
                          <span
                            className={`status-tag status-${property.status}`}
                          >
                            {statusLabel(property.status)}
                          </span>
                        </td>
                        <td>
                          <button
                            className="row-action"
                            type="button"
                            onClick={() => void openDetails(property)}
                            aria-label={`פתיחת ${property.name}`}
                          >
                            ←
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-mark" aria-hidden="true">
                  ⌂
                </span>
                <h2>{search ? "לא נמצאו תוצאות" : "עדיין אין נכסים בתיק"}</h2>
                <p>
                  {search
                    ? "נסו לשנות את מילות החיפוש."
                    : "הוסיפו את הנכס הראשון כדי להתחיל לנהל את התיק."}
                </p>
                {!search && (
                  <button
                    className="secondary-action"
                    type="button"
                    onClick={startCreate}
                  >
                    הוספת נכס ראשון
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        {view === "detail" && selected && (
          <section className="property-detail">
            <div className="detail-topline">
              <div>
                <span className={`status-tag status-${selected.status}`}>
                  {statusLabel(selected.status)}
                </span>
                <p className="detail-location">
                  {selected.address}, {selected.city}
                </p>
              </div>
              <div className="detail-actions">
                <button
                  className="secondary-action"
                  type="button"
                  onClick={() => startEdit(selected)}
                >
                  עריכת הגדרות הדירה
                </button>
              </div>
            </div>

            <div className="detail-tabs" role="tablist" aria-label="תצוגת נכס">
              <button
                className={detailTab === "monthly" ? "active" : ""}
                type="button"
                role="tab"
                aria-selected={detailTab === "monthly"}
                onClick={() => setDetailTab("monthly")}
              >
                תזרים חודשי
              </button>
              <button
                className={detailTab === "summary" ? "active" : ""}
                type="button"
                role="tab"
                aria-selected={detailTab === "summary"}
                onClick={() => setDetailTab("summary")}
              >
                סיכום הכנסות והוצאות
              </button>
              <button
                className={detailTab === "settings" ? "active" : ""}
                type="button"
                role="tab"
                aria-selected={detailTab === "settings"}
                onClick={() => setDetailTab("settings")}
              >
                הגדרות הדירה
              </button>
            </div>

            {detailTab === "monthly" ? (
              <section className="monthly-cashflow">
                <div className="month-toolbar">
                  <button
                    className="month-arrow"
                    type="button"
                    onClick={() => selectMonth(shiftMonth(selectedMonth, -1))}
                    aria-label="חודש קודם"
                    title="חודש קודם"
                  >
                    ‹
                  </button>
                  <h2>{formatMonth(selectedMonth)}</h2>
                  <button
                    className="month-arrow"
                    type="button"
                    onClick={() => selectMonth(shiftMonth(selectedMonth, 1))}
                    aria-label="חודש הבא"
                    title="חודש הבא"
                  >
                    ›
                  </button>
                </div>

                <div className="monthly-summary">
                  <div className="summary-item income-summary">
                    <span>הכנסות החודש</span>
                    <strong>{formatCurrency(monthlyIncome)}</strong>
                  </div>
                  <div className="summary-item expense-summary">
                    <span>הוצאות החודש</span>
                    <strong>{formatCurrency(monthlyExpenses)}</strong>
                  </div>
                  <div
                    className={`summary-item result-summary ${monthlyResult >= 0 ? "positive" : "negative"}`}
                  >
                    <span>
                      {monthlyResult >= 0 ? "רווח חודשי" : "הפסד חודשי"}
                    </span>
                    <strong>{formatCurrency(Math.abs(monthlyResult))}</strong>
                  </div>
                </div>

                <form
                  className={`transaction-form ${transactionDraft.type}-entry`}
                  onSubmit={addMonthlyTransaction}
                >
                  <div className="transaction-form-heading">
                    <div>
                      <h2>
                        {transactionDraft.type === "income"
                          ? "הוספת הכנסה"
                          : "הוספת הוצאה"}
                      </h2>
                      <p className="transaction-period-label">
                        לחודש {formatMonth(selectedMonth)}
                      </p>
                    </div>
                    <div
                      className="transaction-kind"
                      role="group"
                      aria-label="סוג תנועה"
                    >
                      <button
                        className={
                          transactionDraft.type === "income"
                            ? "active income-choice"
                            : ""
                        }
                        type="button"
                        aria-pressed={transactionDraft.type === "income"}
                        onClick={() =>
                          setTransactionDraft((draft) => ({
                            ...draft,
                            type: "income",
                            category: "",
                            customCategory: "",
                          }))
                        }
                      >
                        <span aria-hidden="true">＋</span> הכנסה
                      </button>
                      <button
                        className={
                          transactionDraft.type === "expense"
                            ? "active expense-choice"
                            : ""
                        }
                        type="button"
                        aria-pressed={transactionDraft.type === "expense"}
                        onClick={() =>
                          setTransactionDraft((draft) => ({
                            ...draft,
                            type: "expense",
                            category: "",
                            customCategory: "",
                          }))
                        }
                      >
                        <span aria-hidden="true">−</span> הוצאה
                      </button>
                    </div>
                  </div>
                  <div className="transaction-fields">
                    <label className="property-field transaction-category">
                      קטגוריה
                      <select
                        value={transactionDraft.category}
                        onChange={(event) =>
                          setTransactionDraft((draft) => ({
                            ...draft,
                            category: event.target.value,
                            customCategory: "",
                          }))
                        }
                        required
                      >
                        <option value="" disabled>
                          בחירת קטגוריה
                        </option>
                        {(transactionDraft.type === "income"
                          ? INCOME_CATEGORIES
                          : EXPENSE_CATEGORIES
                        ).map((category) => (
                          <option value={category.id} key={category.id}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {transactionDraft.category === "other" && (
                      <label className="property-field transaction-custom-category">
                        שם הקטגוריה
                        <input
                          value={transactionDraft.customCategory}
                          onChange={(event) =>
                            setTransactionDraft((draft) => ({
                              ...draft,
                              customCategory: event.target.value,
                            }))
                          }
                          placeholder="הקלדת קטגוריה"
                          required
                        />
                      </label>
                    )}
                    <label className="property-field transaction-description">
                      תיאור
                      <input
                        value={transactionDraft.description}
                        onChange={(event) =>
                          setTransactionDraft((draft) => ({
                            ...draft,
                            description: event.target.value,
                          }))
                        }
                        placeholder={
                          transactionDraft.type === "income"
                            ? "למשל: שכר דירה"
                            : "למשל: תיקון אינסטלציה"
                        }
                        required
                      />
                    </label>
                    <label className="property-field transaction-amount">
                      סכום (₪)
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={transactionDraft.amount}
                        onChange={(event) =>
                          setTransactionDraft((draft) => ({
                            ...draft,
                            amount: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                    <label className="property-field transaction-date">
                      תאריך
                      <input
                        type="date"
                        value={transactionDraft.date}
                        onChange={(event) => {
                          const date = event.target.value;
                          if (date) setSelectedMonth(date.slice(0, 7));
                          setTransactionDraft((draft) => ({ ...draft, date }));
                        }}
                        required
                      />
                    </label>
                    <button
                      className="primary-action transaction-submit"
                      type="submit"
                      disabled={transactionSaving}
                    >
                      {transactionSaving ? "שומרים..." : "הוספה לחודש"}
                    </button>
                  </div>
                </form>

                <section className="transaction-list" aria-label="תנועות החודש">
                  <div className="transaction-list-heading">
                    <h2>תנועות החודש</h2>
                    <span>{transactions.length} תנועות</span>
                  </div>
                  {transactionsLoading ||
                  loadedTransactionMonth !== selectedMonth ? (
                    <div className="transaction-empty">טוענים תנועות...</div>
                  ) : transactions.length ? (
                    <div className="transaction-table-wrap">
                      <table className="transaction-table">
                        <thead>
                          <tr>
                            <th>תאריך</th>
                            <th>קטגוריה</th>
                            <th>תיאור</th>
                            <th>סוג</th>
                            <th>סכום</th>
                            <th>
                              <span className="sr-only">מחיקה</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.map((transaction) => (
                            <tr key={transaction.id}>
                              <td>
                                {new Intl.DateTimeFormat("he-IL").format(
                                  new Date(`${transaction.date}T12:00:00`),
                                )}
                              </td>
                              <td>{categoryLabel(transaction)}</td>
                              <td>{transaction.description}</td>
                              <td>
                                <span
                                  className={`transaction-tag ${transaction.type}`}
                                >
                                  {transaction.type === "income"
                                    ? "הכנסה"
                                    : "הוצאה"}
                                </span>
                              </td>
                              <td
                                className={`transaction-amount-value ${transaction.type}`}
                              >
                                {transaction.type === "income" ? "+" : "−"}
                                {formatCurrency(transaction.amount)}
                              </td>
                              <td>
                                <button
                                  className="transaction-delete"
                                  type="button"
                                  onClick={() =>
                                    void removeMonthlyTransaction(
                                      transaction.id,
                                    )
                                  }
                                  aria-label={`מחיקת ${transaction.description}`}
                                  title="מחיקת תנועה"
                                >
                                  ×
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="transaction-empty">
                      אין תנועות בחודש הזה
                    </div>
                  )}
                </section>
              </section>
            ) : detailTab === "summary" ? (
              <section className="yearly-summary-view">
                <div className="year-filter-row">
                  <div>
                    <h2>סיכום הכנסות והוצאות</h2>
                    <p>תמונה שנתית לפי כל התנועות בנכס</p>
                  </div>
                  <label className="year-filter">
                    הצגת שנה
                    <select
                      value={summaryYear}
                      onChange={(event) =>
                        setSummaryYear(Number(event.target.value))
                      }
                    >
                      {yearOptions.map((year) => (
                        <option value={year} key={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="monthly-summary yearly-summary-cards">
                  <div className="summary-item income-summary">
                    <span>הכנסות בשנת {summaryYear}</span>
                    <strong>{formatCurrency(yearlyIncome)}</strong>
                  </div>
                  <div className="summary-item expense-summary">
                    <span>הוצאות בשנת {summaryYear}</span>
                    <strong>{formatCurrency(yearlyExpenses)}</strong>
                  </div>
                  <div
                    className={`summary-item result-summary ${yearlyIncome - yearlyExpenses >= 0 ? "positive" : "negative"}`}
                  >
                    <span>
                      {yearlyIncome - yearlyExpenses >= 0
                        ? "רווח שנתי"
                        : "הפסד שנתי"}
                    </span>
                    <strong>
                      {formatCurrency(Math.abs(yearlyIncome - yearlyExpenses))}
                    </strong>
                  </div>
                </div>
                <div className="category-pie-grid">
                  <CategoryPie
                    title="חלוקת הכנסות לפי קטגוריה"
                    type="income"
                    slices={yearlyIncomeSlices}
                  />
                  <CategoryPie
                    title="חלוקת הוצאות לפי קטגוריה"
                    type="expense"
                    slices={yearlyExpenseSlices}
                  />
                </div>
                <section className="transaction-list yearly-month-list">
                  <div className="transaction-list-heading">
                    <h2>פירוט לפי חודש</h2>
                    {summaryLoading && <span>טוענים סיכום...</span>}
                  </div>
                  <div className="transaction-table-wrap">
                    <table className="transaction-table">
                      <thead>
                        <tr>
                          <th>חודש</th>
                          <th>הכנסות</th>
                          <th>הוצאות</th>
                          <th>רווח / הפסד</th>
                          <th>
                            <span className="sr-only">מעבר לחודש</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 12 }, (_, index) => {
                          const month = `${summaryYear}-${String(index + 1).padStart(2, "0")}`;
                          const monthTransactions = yearlyTransactions.filter(
                            (transaction) =>
                              transaction.date.startsWith(`${month}-`),
                          );
                          const income = monthTransactions
                            .filter(
                              (transaction) => transaction.type === "income",
                            )
                            .reduce(
                              (sum, transaction) => sum + transaction.amount,
                              0,
                            );
                          const expenses = monthTransactions
                            .filter(
                              (transaction) => transaction.type === "expense",
                            )
                            .reduce(
                              (sum, transaction) => sum + transaction.amount,
                              0,
                            );
                          const result = income - expenses;
                          return (
                            <tr key={month}>
                              <td>{formatMonth(month)}</td>
                              <td className="transaction-amount-value income">
                                {formatCurrency(income)}
                              </td>
                              <td className="transaction-amount-value expense">
                                {formatCurrency(expenses)}
                              </td>
                              <td
                                className={`transaction-amount-value ${result >= 0 ? "income" : "expense"}`}
                              >
                                {result < 0 ? "−" : ""}
                                {formatCurrency(Math.abs(result))}
                              </td>
                              <td>
                                <button
                                  className="month-open-button"
                                  type="button"
                                  onClick={() => {
                                    selectMonth(month);
                                    setDetailTab("monthly");
                                  }}
                                >
                                  פתיחת חודש
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              </section>
            ) : (
              <div className="detail-grid">
                <section className="detail-section">
                  <h2>פרטי הנכס</h2>
                  <dl className="facts-grid">
                    <div>
                      <dt>מחיר דירה</dt>
                      <dd>{formatCurrency(selected.apartmentPrice)}</dd>
                    </div>
                    <div>
                      <dt>תאריך רכישה</dt>
                      <dd>{selected.purchaseDate || "לא צוין"}</dd>
                    </div>
                  </dl>
                </section>
                <section className="detail-section cost-section">
                  <div className="subsection-heading">
                    <h2>עלויות הנכס</h2>
                    <span>
                      {(selected.additionalCosts ?? []).length} עלויות נוספות
                    </span>
                  </div>
                  <div className="cost-breakdown">
                    <div className="cost-row">
                      <span>מחיר דירה (עלות בסיסית)</span>
                      <strong>{formatCurrency(selected.apartmentPrice)}</strong>
                    </div>
                    {(selected.additionalCosts ?? []).map((cost) => (
                      <div className="cost-row" key={cost.id}>
                        <span>{cost.name}</span>
                        <strong>{formatCurrency(cost.amount)}</strong>
                      </div>
                    ))}
                    <div className="cost-row cost-total">
                      <span>עלות כוללת</span>
                      <strong>
                        {formatCurrency(totalPropertyCost(selected))}
                      </strong>
                    </div>
                  </div>
                </section>
                {selected.notes && (
                  <section className="detail-section notes-section">
                    <h2>הערות</h2>
                    <p>{selected.notes}</p>
                  </section>
                )}
              </div>
            )}
          </section>
        )}

        {view === "form" && (
          <form className="property-form" onSubmit={saveProperty}>
            <section className="form-section">
              <h2>פרטי הנכס</h2>
              <div className="form-grid">
                <label className="property-field field-wide">
                  שם הנכס
                  <input
                    value={draft.name}
                    onChange={(event) =>
                      setDraft({ ...draft, name: event.target.value })
                    }
                    placeholder="למשל: דירת גן ברחוב הרצל"
                    maxLength={100}
                    required
                  />
                </label>
                <label className="property-field">
                  כתובת
                  <input
                    value={draft.address}
                    onChange={(event) =>
                      setDraft({ ...draft, address: event.target.value })
                    }
                    maxLength={200}
                    required
                  />
                </label>
                <label className="property-field">
                  עיר
                  <input
                    value={draft.city}
                    onChange={(event) =>
                      setDraft({ ...draft, city: event.target.value })
                    }
                    maxLength={100}
                    required
                  />
                </label>
                <label className="property-field">
                  מחיר דירה (עלות בסיסית, ₪)
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={draft.apartmentPrice}
                    onChange={(event) =>
                      setDraft({ ...draft, apartmentPrice: event.target.value })
                    }
                  />
                </label>
                <label className="property-field">
                  תאריך רכישה
                  <input
                    type="date"
                    value={draft.purchaseDate}
                    onChange={(event) =>
                      setDraft({ ...draft, purchaseDate: event.target.value })
                    }
                  />
                </label>
                <label className="property-field field-wide">
                  הערות
                  <textarea
                    rows={3}
                    value={draft.notes}
                    onChange={(event) =>
                      setDraft({ ...draft, notes: event.target.value })
                    }
                    maxLength={5000}
                  />
                </label>
              </div>
            </section>

            <section className="form-section additional-costs-section">
              <div className="subsection-heading">
                <div>
                  <h2>עלויות נוספות</h2>
                  <p>הוסיפו מס רכישה, שיפוץ, עורך דין או כל הוצאה אחרת.</p>
                </div>
                <button
                  className="cost-add-button"
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      additionalCosts: [
                        ...draft.additionalCosts,
                        { id: crypto.randomUUID(), name: "", amount: "" },
                      ],
                    })
                  }
                >
                  ＋ הוספת עלות
                </button>
              </div>
              {draft.additionalCosts.length > 0 ? (
                <div className="additional-cost-list">
                  {draft.additionalCosts.map((cost, index) => (
                    <div className="additional-cost-row" key={cost.id}>
                      <label className="property-field">
                        סוג העלות
                        <input
                          value={cost.name}
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              additionalCosts: draft.additionalCosts.map(
                                (item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, name: event.target.value }
                                    : item,
                              ),
                            })
                          }
                          placeholder="למשל: מס רכישה או שיפוץ"
                          required
                        />
                      </label>
                      <label className="property-field cost-amount-field">
                        סכום (₪)
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={cost.amount}
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              additionalCosts: draft.additionalCosts.map(
                                (item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, amount: event.target.value }
                                    : item,
                              ),
                            })
                          }
                          required
                        />
                      </label>
                      <button
                        className="cost-remove-button"
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            additionalCosts: draft.additionalCosts.filter(
                              (item) => item.id !== cost.id,
                            ),
                          })
                        }
                        aria-label={`הסרת עלות ${cost.name || index + 1}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-additional-costs">לא הוזנו עלויות נוספות</p>
              )}
              <div className="cost-total form-cost-total">
                <span>עלות כוללת משוערת</span>
                <strong>
                  {formatCurrency(
                    (Number(draft.apartmentPrice) || 0) +
                      draft.additionalCosts.reduce(
                        (total, cost) => total + (Number(cost.amount) || 0),
                        0,
                      ),
                  )}
                </strong>
              </div>
            </section>

            <div className="form-actions">
              <button
                className="primary-action"
                type="submit"
                disabled={saving}
              >
                {saving ? "שומרים..." : "שמירת נכס"}
              </button>
              <button
                className="quiet-button"
                type="button"
                onClick={() =>
                  setView(editingId && selected ? "detail" : "list")
                }
              >
                ביטול
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
