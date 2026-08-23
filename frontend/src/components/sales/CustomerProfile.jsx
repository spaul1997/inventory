import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, ChevronRight as Crumb, Plus, Trash2 } from "lucide-react";
import { customerTypes, customerCategories, indianStates, paymentTermsOptions, salesRoles, nextId, today, now, money0, number } from "../../data/sales/shared.js";
import { CUSTOMER_STATUSES } from "../../data/sales/customers.js";
import { Badge, Panel } from "../ui.jsx";
import { AuditStrip } from "../manufacturing/AuditStrip.jsx";
import { keyOf, useSalesData } from "./SalesDataContext.jsx";
import { useCustomerOutstanding } from "./salesUtils.js";
import { useToast } from "../Toast.jsx";

const tabs = [
  { key: "overview", label: "Overview" },
  { key: "contacts", label: "Contacts" },
  { key: "addresses", label: "Billing & Shipping" },
  { key: "tax", label: "Tax & Compliance" },
  { key: "credit", label: "Credit & Terms" },
  { key: "orders", label: "Sales Orders" },
  { key: "allocations", label: "Allocations" },
  { key: "dispatches", label: "Dispatches" },
  { key: "invoices", label: "Invoices" },
  { key: "returns", label: "Returns" },
  { key: "outstanding", label: "Outstanding & Payments" },
  { key: "attachments", label: "Attachments" },
  { key: "notes", label: "Notes & Activity" },
];

const inputClass = "w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-[var(--muted)]";

function TextField({ label, value, onChange, disabled, type = "text", required }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
        {label}
        {required && <span className="ml-0.5 text-[var(--danger)]">*</span>}
      </label>
      <input type={type} value={value || ""} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </div>
  );
}

function SelectField({ label, value, onChange, disabled, options, required }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
        {label}
        {required && <span className="ml-0.5 text-[var(--danger)]">*</span>}
      </label>
      <select value={value || ""} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Select...</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleField({ label, value, onChange, disabled }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border border-[var(--line)] px-3 py-2.5">
      <span className="text-sm font-medium text-[var(--ink)]">{label}</span>
      <button type="button" disabled={disabled} onClick={() => onChange(!value)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${value ? "bg-[var(--primary)]" : "bg-slate-200"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}

function EditableTable({ columns, rows, disabled, onChange, addLabel }) {
  const items = rows || [];
  return (
    <div>
      <div className="overflow-x-auto rounded-md border border-[var(--line)]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-[var(--muted)]">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-2 py-2 first:pl-3">
                  {c.label}
                </th>
              ))}
              {!disabled && <th className="px-2 py-2" />}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-4 text-center text-sm text-[var(--muted)]">
                  None yet.
                </td>
              </tr>
            )}
            {items.map((row, index) => (
              <tr key={index} className="border-t border-slate-100">
                {columns.map((c) => (
                  <td key={c.key} className="px-2 py-1.5 first:pl-3">
                    {c.type === "checkbox" ? (
                      <input
                        type="checkbox"
                        disabled={disabled}
                        checked={Boolean(row[c.key])}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[index] = { ...row, [c.key]: e.target.checked };
                          onChange(updated);
                        }}
                        className="h-4 w-4"
                      />
                    ) : c.type === "select" ? (
                      <select
                        disabled={disabled}
                        value={row[c.key] || ""}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[index] = { ...row, [c.key]: e.target.value };
                          onChange(updated);
                        }}
                        className="w-full min-w-[110px] rounded border border-[var(--line)] px-2 py-1.5 text-sm disabled:bg-slate-50"
                      >
                        <option value="">—</option>
                        {c.options.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        disabled={disabled}
                        value={row[c.key] || ""}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[index] = { ...row, [c.key]: e.target.value };
                          onChange(updated);
                        }}
                        className="w-full min-w-[110px] rounded border border-[var(--line)] px-2 py-1.5 text-sm disabled:bg-slate-50"
                      />
                    )}
                  </td>
                ))}
                {!disabled && (
                  <td className="px-2 py-1.5">
                    <button type="button" onClick={() => onChange(items.filter((_, i) => i !== index))} className="inline-flex h-7 w-7 items-center justify-center rounded text-[var(--muted)] hover:bg-red-50 hover:text-[var(--danger)]">
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!disabled && (
        <button type="button" onClick={() => onChange([...items, {}])} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary-deep)]">
          <Plus size={13} /> {addLabel}
        </button>
      )}
    </div>
  );
}

function LinkedRecordsTable({ title, rows, columns, newTo, newLabel }) {
  return (
    <Panel
      title={title}
      action={
        newTo && (
          <Link to={newTo} className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--primary-deep)]">
            {newLabel}
          </Link>
        )
      }
    >
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--muted)]">Nothing recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--line)]">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-[var(--muted)]">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className={`px-3 py-2 ${c.align === "right" ? "text-right" : ""}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  {columns.map((c) => {
                    const val = c.render ? c.render(row) : row[c.key];
                    return (
                      <td key={c.key} className={`px-3 py-2 ${c.align === "right" ? "text-right" : ""}`}>
                        {c.badge ? <Badge>{val}</Badge> : c.link ? (
                          <Link to={c.link(row)} className="font-mono text-xs font-medium text-[var(--primary)] hover:underline">
                            {val}
                          </Link>
                        ) : (
                          val
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

export function CustomerProfile({ mode, recordId }) {
  const salesData = useSalesData();
  const showToast = useToast();
  const navigate = useNavigate();
  const isView = mode === "view";
  const isCreate = mode === "create";

  const existingRecord = recordId ? salesData.getRecord("customer-management", recordId) : null;

  const [values, setValues] = useState(() => {
    if (existingRecord) return { ...existingRecord };
    const rows = salesData.getRows("customer-management");
    return {
      code: nextId(rows, "code", "CUST-1001"),
      customerType: "Business",
      category: "Standard",
      status: "Active",
      currency: "INR",
      billingCountry: "India",
      shippingAddresses: [],
      contacts: [],
      attachments: [],
      notes: [],
    };
  });

  const [activeTab, setActiveTab] = useState("overview");
  const [errorBanner, setErrorBanner] = useState("");
  const outstanding = useCustomerOutstanding(values.code);
  const disabled = isView;

  function setField(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function validate() {
    if (!values.name || !values.customerType || !values.mobile) {
      setErrorBanner("Customer name, type and mobile number are required.");
      return false;
    }
    setErrorBanner("");
    return true;
  }

  function handleSave() {
    if (!validate()) return;
    const record = { ...values, updatedBy: "You", updatedAt: now() };
    if (isCreate) {
      record.createdBy = "You";
      record.createdAt = now();
      salesData.addRow("customer-management", record);
    } else {
      salesData.updateRow("customer-management", values.code, record);
    }
    setValues(record);
    showToast(`${record.code} saved.`);
    navigate(isCreate ? `/sales/customer-management/${record.code}/view` : "/sales/customer-management");
  }

  const salesOrders = salesData.getRows("sales-order").filter((r) => r.customerId === values.code);
  const allocations = salesData.getRows("product-allocation").filter((r) => r.customerId === values.code);
  const dispatches = salesData.getRows("delivery-dispatch").filter((r) => r.customerId === values.code);
  const invoices = salesData.getRows("sales-invoice").filter((r) => r.customerId === values.code);
  const returns = salesData.getRows("sales-return").filter((r) => r.customerId === values.code);

  return (
    <div>
      <p className="mb-2 flex items-center gap-1 text-xs text-[var(--muted)] print:hidden">
        <span>Sales</span>
        <Crumb size={12} />
        <Link to="/sales/customer-management" className="hover:text-[var(--primary)]">
          Customer Management
        </Link>
        <Crumb size={12} />
        <span className="text-[var(--ink)]">{isView ? values.code : isCreate ? "New Customer" : `Edit ${values.code}`}</span>
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold text-[var(--ink)]">{isCreate ? "New Customer" : `${values.code} — ${values.name || "Untitled"}`}</h2>
        {!isCreate && <Badge>{values.status}</Badge>}
      </div>
      {isView && <AuditStrip record={values} />}

      {errorBanner && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 print:hidden">
          <AlertCircle size={16} />
          {errorBanner}
        </div>
      )}

      <div className="mt-4 rounded-md border border-[var(--line)] bg-white">
        <div className="flex flex-wrap gap-1 overflow-x-auto border-b border-[var(--line)] px-3 pt-2 print:hidden">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap rounded-t-md border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.key ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-5">
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <TextField label="Customer Code" value={values.code} disabled />
              <TextField label="Customer Name" value={values.name} onChange={(v) => setField("name", v)} disabled={disabled} required />
              <TextField label="Company Name" value={values.companyName} onChange={(v) => setField("companyName", v)} disabled={disabled} />
              <SelectField label="Customer Type" value={values.customerType} onChange={(v) => setField("customerType", v)} disabled={disabled} options={customerTypes} required />
              <SelectField label="Category" value={values.category} onChange={(v) => setField("category", v)} disabled={disabled} options={customerCategories} />
              <TextField label="Industry" value={values.industry} onChange={(v) => setField("industry", v)} disabled={disabled} />
              <TextField label="Contact Person" value={values.contactPerson} onChange={(v) => setField("contactPerson", v)} disabled={disabled} />
              <TextField label="Mobile Number" value={values.mobile} onChange={(v) => setField("mobile", v)} disabled={disabled} required />
              <TextField label="Email" value={values.email} onChange={(v) => setField("email", v)} disabled={disabled} />
              <SelectField label="Salesperson" value={values.salesperson} onChange={(v) => setField("salesperson", v)} disabled={disabled} options={salesRoles.filter((r) => r === "Sales Executive" || r === "Sales Manager").length ? ["Meera Iyer", "Rajesh Kumar", "Anil Deshmukh"] : []} />
              <SelectField label="Priority" value={values.priority} onChange={(v) => setField("priority", v)} disabled={disabled} options={["Low", "Normal", "High"]} />
              <SelectField label="Status" value={values.status} onChange={(v) => setField("status", v)} disabled={disabled} options={CUSTOMER_STATUSES} />
            </div>
          )}

          {activeTab === "contacts" && (
            <EditableTable
              addLabel="Add Contact"
              disabled={disabled}
              rows={values.contacts}
              onChange={(rows) => setField("contacts", rows)}
              columns={[
                { key: "name", label: "Name" },
                { key: "department", label: "Department" },
                { key: "designation", label: "Designation" },
                { key: "mobile", label: "Mobile" },
                { key: "email", label: "Email" },
                { key: "isPrimary", label: "Primary", type: "checkbox" },
                { key: "isBilling", label: "Billing", type: "checkbox" },
                { key: "isDelivery", label: "Delivery", type: "checkbox" },
              ]}
            />
          )}

          {activeTab === "addresses" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <TextField label="Billing Contact Name" value={values.billingContactName} onChange={(v) => setField("billingContactName", v)} disabled={disabled} />
                <TextField label="Address Line 1" value={values.billingAddressLine1} onChange={(v) => setField("billingAddressLine1", v)} disabled={disabled} />
                <TextField label="Address Line 2" value={values.billingAddressLine2} onChange={(v) => setField("billingAddressLine2", v)} disabled={disabled} />
                <TextField label="City" value={values.billingCity} onChange={(v) => setField("billingCity", v)} disabled={disabled} />
                <SelectField label="State" value={values.billingState} onChange={(v) => setField("billingState", v)} disabled={disabled} options={indianStates} />
                <TextField label="Postal Code" value={values.billingPostalCode} onChange={(v) => setField("billingPostalCode", v)} disabled={disabled} />
                <TextField label="Billing Phone" value={values.billingPhone} onChange={(v) => setField("billingPhone", v)} disabled={disabled} />
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-[var(--ink)]">Shipping Addresses</p>
                <EditableTable
                  addLabel="Add Shipping Address"
                  disabled={disabled}
                  rows={values.shippingAddresses}
                  onChange={(rows) => setField("shippingAddresses", rows)}
                  columns={[
                    { key: "label", label: "Label" },
                    { key: "contact", label: "Contact" },
                    { key: "phone", label: "Phone" },
                    { key: "line1", label: "Address" },
                    { key: "city", label: "City" },
                    { key: "state", label: "State" },
                    { key: "postalCode", label: "PIN" },
                    { key: "isDefault", label: "Default", type: "checkbox" },
                  ]}
                />
              </div>
            </div>
          )}

          {activeTab === "tax" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <SelectField label="GST Registration Type" value={values.gstRegistrationType} onChange={(v) => setField("gstRegistrationType", v)} disabled={disabled} options={["Regular", "Composition", "Unregistered", "SEZ", "Export"]} />
              <TextField label="GSTIN" value={values.gstin} onChange={(v) => setField("gstin", v)} disabled={disabled} />
              <TextField label="PAN" value={values.pan} onChange={(v) => setField("pan", v)} disabled={disabled} />
              <TextField label="GST State Code" value={values.gstStateCode} onChange={(v) => setField("gstStateCode", v)} disabled={disabled} />
              <TextField label="MSME Registration No." value={values.msmeNumber} onChange={(v) => setField("msmeNumber", v)} disabled={disabled} />
              <SelectField label="Tax Treatment" value={values.taxTreatment} onChange={(v) => setField("taxTreatment", v)} disabled={disabled} options={["Taxable", "Exempt", "Nil Rated", "Zero Rated"]} />
              <ToggleField label="Reverse Charge Applicable" value={values.reverseCharge} onChange={(v) => setField("reverseCharge", v)} disabled={disabled} />
              <ToggleField label="TDS Applicable" value={values.tdsApplicable} onChange={(v) => setField("tdsApplicable", v)} disabled={disabled} />
              <ToggleField label="TCS Applicable" value={values.tcsApplicable} onChange={(v) => setField("tcsApplicable", v)} disabled={disabled} />
            </div>
          )}

          {activeTab === "credit" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <TextField label="Credit Limit" type="number" value={values.creditLimit} onChange={(v) => setField("creditLimit", v)} disabled={disabled} />
              <TextField label="Credit Period (days)" type="number" value={values.creditPeriodDays} onChange={(v) => setField("creditPeriodDays", v)} disabled={disabled} />
              <SelectField label="Payment Terms" value={values.paymentTerms} onChange={(v) => setField("paymentTerms", v)} disabled={disabled} options={paymentTermsOptions} />
              <TextField label="Discount %" type="number" value={values.discountPercent} onChange={(v) => setField("discountPercent", v)} disabled={disabled} />
              <TextField label="Max Discount %" type="number" value={values.maxDiscountPercent} onChange={(v) => setField("maxDiscountPercent", v)} disabled={disabled} />
              <TextField label="Minimum Order Value" type="number" value={values.minOrderValue} onChange={(v) => setField("minOrderValue", v)} disabled={disabled} />
              <TextField label="Bank Name" value={values.bankName} onChange={(v) => setField("bankName", v)} disabled={disabled} />
              <TextField label="Account Number" value={values.accountNumber} onChange={(v) => setField("accountNumber", v)} disabled={disabled} />
              <TextField label="IFSC Code" value={values.ifsc} onChange={(v) => setField("ifsc", v)} disabled={disabled} />
              <TextField label="UPI ID" value={values.upiId} onChange={(v) => setField("upiId", v)} disabled={disabled} />
              <ToggleField label="Credit Hold" value={values.creditHoldStatus} onChange={(v) => setField("creditHoldStatus", v)} disabled={disabled} />
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Financial Remarks</label>
                <textarea value={values.financialRemarks || ""} disabled={disabled} onChange={(e) => setField("financialRemarks", e.target.value)} rows={2} className={inputClass} />
              </div>
            </div>
          )}

          {activeTab === "orders" && (
            <LinkedRecordsTable
              title="Sales Orders"
              rows={salesOrders}
              newTo={`/sales/sales-order/new`}
              newLabel="New Sales Order"
              columns={[
                { key: "id", label: "Order No", link: (r) => `/sales/sales-order/${r.id}/view` },
                { key: "date", label: "Date" },
                { key: "items", label: "Items", render: (r) => r.items.length },
                { key: "status", label: "Status", badge: true },
              ]}
            />
          )}
          {activeTab === "allocations" && (
            <LinkedRecordsTable
              title="Product Allocations"
              rows={allocations}
              columns={[
                { key: "id", label: "Allocation No", link: (r) => `/sales/product-allocation/${r.id}/view` },
                { key: "salesOrderId", label: "Sales Order" },
                { key: "warehouse", label: "Warehouse" },
                { key: "status", label: "Status", badge: true },
              ]}
            />
          )}
          {activeTab === "dispatches" && (
            <LinkedRecordsTable
              title="Dispatches"
              rows={dispatches}
              columns={[
                { key: "id", label: "Dispatch No", link: (r) => `/sales/delivery-dispatch/${r.id}/view` },
                { key: "date", label: "Date" },
                { key: "vehicleNumber", label: "Vehicle No" },
                { key: "status", label: "Status", badge: true },
              ]}
            />
          )}
          {activeTab === "invoices" && (
            <LinkedRecordsTable
              title="Invoices"
              rows={invoices}
              columns={[
                { key: "id", label: "Invoice No", link: (r) => `/sales/sales-invoice/${r.id}/view` },
                { key: "date", label: "Date" },
                { key: "dueDate", label: "Due Date" },
                { key: "status", label: "Status", badge: true },
              ]}
            />
          )}
          {activeTab === "returns" && (
            <LinkedRecordsTable
              title="Returns"
              rows={returns}
              columns={[
                { key: "id", label: "Return No", link: (r) => `/sales/sales-return/${r.id}/view` },
                { key: "date", label: "Date" },
                { key: "invoiceId", label: "Invoice" },
                { key: "status", label: "Status", badge: true },
              ]}
            />
          )}

          {activeTab === "outstanding" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-md border border-[var(--line)] bg-white p-4">
                  <p className="text-sm text-[var(--muted)]">Total Outstanding</p>
                  <p className="mt-1.5 text-xl font-semibold text-[var(--danger)]">{money0.format(outstanding.totalOutstanding)}</p>
                </div>
                <div className="rounded-md border border-[var(--line)] bg-white p-4">
                  <p className="text-sm text-[var(--muted)]">Open Invoices</p>
                  <p className="mt-1.5 text-xl font-semibold text-[var(--ink)]">{number.format(outstanding.openInvoiceCount)}</p>
                </div>
                <div className="rounded-md border border-[var(--line)] bg-white p-4">
                  <p className="text-sm text-[var(--muted)]">Credit Notes Applied</p>
                  <p className="mt-1.5 text-xl font-semibold text-emerald-700">{money0.format(outstanding.totalCreditNotes)}</p>
                </div>
              </div>
              <Panel title="Aging">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {outstanding.buckets.map((b) => (
                    <div key={b.bucket} className="rounded-md border border-[var(--line)] p-3 text-center">
                      <p className="text-xs text-[var(--muted)]">{b.bucket}</p>
                      <p className="mt-1 font-semibold text-[var(--ink)]">{money0.format(b.value)}</p>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel title="Payment History">
                {outstanding.payments.length === 0 ? (
                  <p className="py-4 text-center text-sm text-[var(--muted)]">No payments recorded yet.</p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                      <tr>
                        <th className="py-2">Date</th>
                        <th>Invoice</th>
                        <th>Mode</th>
                        <th className="text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outstanding.payments.map((p, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="py-2">{p.date}</td>
                          <td className="font-mono text-xs">{p.invoiceId}</td>
                          <td>{p.mode}</td>
                          <td className="text-right font-medium">{money0.format(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Panel>
            </div>
          )}

          {activeTab === "attachments" && (
            <EditableTable
              addLabel="Add Attachment"
              disabled={disabled}
              rows={values.attachments}
              onChange={(rows) => setField("attachments", rows)}
              columns={[
                { key: "name", label: "File Name" },
                { key: "uploadedBy", label: "Uploaded By" },
                { key: "date", label: "Date" },
              ]}
            />
          )}

          {activeTab === "notes" && (
            <div className="space-y-4">
              <EditableTable
                addLabel="Add Note"
                disabled={disabled}
                rows={values.notes}
                onChange={(rows) => setField("notes", rows)}
                columns={[
                  { key: "text", label: "Note" },
                  { key: "by", label: "By" },
                  { key: "date", label: "Date" },
                ]}
              />
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 mt-5 flex flex-wrap items-center justify-end gap-2 rounded-md border border-[var(--line)] bg-white/95 p-3 shadow-[0_-4px_12px_rgba(15,23,42,0.06)] backdrop-blur print:hidden">
        <button type="button" onClick={() => navigate("/sales/customer-management")} className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
          {isView ? "Close" : "Cancel"}
        </button>
        {isView && (
          <>
            <button type="button" onClick={() => window.print()} className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
              Print Statement
            </button>
            <Link to={`/sales/customer-management/${values.code}/edit`} className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-deep)]">
              Edit Customer
            </Link>
          </>
        )}
        {!isView && (
          <button type="button" onClick={handleSave} className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-deep)]">
            Save Customer
          </button>
        )}
      </div>
    </div>
  );
}
