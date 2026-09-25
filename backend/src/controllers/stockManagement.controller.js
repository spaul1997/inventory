import StockManagementDocument from "../models/StockManagementDocument.js";
import StockManagementState from "../models/StockManagementState.js";

const stockEntityKeys = new Set(["stock-transfer", "stock-adjustment", "stock-count"]);
const normalize = (value) => String(value ?? "").trim();

const serializeDocument = (document) => ({
  ...(document.data || {}),
  id: document.documentId,
  status: document.status || document.data?.status || "Draft",
  date: document.data?.date || document.documentDate || "",
  createdAt: document.createdAt,
  updatedAt: document.updatedAt,
});

const documentPatch = (body) => {
  const data = { ...(body || {}) };
  const documentId = normalize(data.id);

  return {
    documentId,
    status: normalize(data.status) || "Draft",
    documentDate: normalize(data.date),
    data: {
      ...data,
      id: documentId,
      items: Array.isArray(data.items) ? data.items : [],
      activity: Array.isArray(data.activity) ? data.activity : [],
    },
  };
};

const serializeState = (state) =>
  state
    ? {
        balances: state.balances && typeof state.balances === "object" ? state.balances : {},
        movements: Array.isArray(state.movements) ? state.movements : [],
        batches: Array.isArray(state.batches) ? state.batches : [],
        updatedAt: state.updatedAt,
      }
    : null;

const statePatch = (body) => ({
  balances: body?.balances && typeof body.balances === "object" && !Array.isArray(body.balances) ? body.balances : {},
  movements: Array.isArray(body?.movements) ? body.movements.slice(0, 20000) : [],
  batches: Array.isArray(body?.batches) ? body.batches.slice(0, 10000) : [],
});

export async function listStockDocuments(req, res, next) {
  try {
    const { entityKey } = req.params;
    if (!stockEntityKeys.has(entityKey)) {
      return res.status(404).json({ message: "Stock entity not found." });
    }

    const rows = await StockManagementDocument.find({ tenantId: req.auth.tenantId, entityKey })
      .sort({ createdAt: -1, documentId: 1 })
      .lean();

    return res.status(200).json({ rows: rows.map(serializeDocument) });
  } catch (error) {
    next(error);
  }
}

export async function createStockDocument(req, res, next) {
  try {
    const { entityKey } = req.params;
    if (!stockEntityKeys.has(entityKey)) {
      return res.status(404).json({ message: "Stock entity not found." });
    }

    const patch = documentPatch(req.body);
    if (!patch.documentId) {
      return res.status(400).json({ message: "Document id is required." });
    }

    const row = await StockManagementDocument.create({
      tenantId: req.auth.tenantId,
      storeId: req.auth.storeId || null,
      entityKey,
      createdBy: req.auth.sub,
      ...patch,
    });

    return res.status(201).json({ row: serializeDocument(row) });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Stock document already exists." });
    }
    next(error);
  }
}

export async function updateStockDocument(req, res, next) {
  try {
    const { entityKey } = req.params;
    if (!stockEntityKeys.has(entityKey)) {
      return res.status(404).json({ message: "Stock entity not found." });
    }

    const currentDocumentId = normalize(req.params.id);
    const current = await StockManagementDocument.findOne({
      tenantId: req.auth.tenantId,
      entityKey,
      documentId: currentDocumentId,
    });

    if (!current) {
      return res.status(404).json({ message: "Stock document not found." });
    }

    const patch = documentPatch({
      ...(current.data || {}),
      ...(req.body || {}),
      id: normalize(req.body?.id) || currentDocumentId,
    });
    const row = await StockManagementDocument.findOneAndUpdate(
      { tenantId: req.auth.tenantId, entityKey, documentId: currentDocumentId },
      { $set: { ...patch, updatedBy: req.auth.sub } },
      { new: true, runValidators: true }
    );

    return res.status(200).json({ row: serializeDocument(row) });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Stock document already exists." });
    }
    next(error);
  }
}

export async function getStockState(req, res, next) {
  try {
    const state = await StockManagementState.findOne({ tenantId: req.auth.tenantId }).lean();
    return res.status(200).json({ state: serializeState(state) });
  } catch (error) {
    next(error);
  }
}

export async function updateStockState(req, res, next) {
  try {
    const patch = statePatch(req.body);
    const state = await StockManagementState.findOneAndUpdate(
      { tenantId: req.auth.tenantId },
      {
        $set: {
          ...patch,
          storeId: req.auth.storeId || null,
          updatedBy: req.auth.sub,
        },
        $setOnInsert: {
          tenantId: req.auth.tenantId,
          createdBy: req.auth.sub,
        },
      },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({ state: serializeState(state) });
  } catch (error) {
    next(error);
  }
}
