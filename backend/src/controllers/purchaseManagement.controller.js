import PurchaseManagementDocument from "../models/PurchaseManagementDocument.js";

const purchaseEntityKeys = new Set(["purchase-request", "purchase-order", "goods-receipt", "purchase-return"]);
const normalize = (value) => String(value ?? "").trim();

const serializePurchaseDocument = (document) => ({
  ...(document.data || {}),
  id: document.documentId,
  status: document.status || document.data?.status || "",
  date: document.data?.date || document.documentDate || "",
  createdAt: document.createdAt,
  updatedAt: document.updatedAt,
});

const purchaseDocumentPatch = (body) => {
  const data = { ...(body || {}) };
  const documentId = normalize(data.id);

  return {
    documentId,
    status: normalize(data.status),
    documentDate: normalize(data.date),
    data: {
      ...data,
      id: documentId,
      items: Array.isArray(data.items) ? data.items : [],
      activity: Array.isArray(data.activity) ? data.activity : [],
    },
  };
};

function validateEntityKey(entityKey) {
  return purchaseEntityKeys.has(entityKey);
}

export async function listPurchaseDocuments(req, res, next) {
  try {
    const { entityKey } = req.params;
    if (!validateEntityKey(entityKey)) {
      return res.status(404).json({ message: "Purchase entity not found." });
    }

    const rows = await PurchaseManagementDocument.find({
      tenantId: req.auth.tenantId,
      entityKey,
    })
      .sort({ createdAt: -1, documentId: 1 })
      .lean();

    return res.status(200).json({
      rows: rows.map(serializePurchaseDocument),
    });
  } catch (error) {
    next(error);
  }
}

export async function createPurchaseDocument(req, res, next) {
  try {
    const { entityKey } = req.params;
    if (!validateEntityKey(entityKey)) {
      return res.status(404).json({ message: "Purchase entity not found." });
    }

    const patch = purchaseDocumentPatch(req.body);
    if (!patch.documentId) {
      return res.status(400).json({ message: "Document id is required." });
    }

    const row = await PurchaseManagementDocument.create({
      tenantId: req.auth.tenantId,
      storeId: req.auth.storeId || null,
      entityKey,
      createdBy: req.auth.sub,
      ...patch,
    });

    return res.status(201).json({
      row: serializePurchaseDocument(row),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Purchase document already exists." });
    }

    next(error);
  }
}

export async function updatePurchaseDocument(req, res, next) {
  try {
    const { entityKey } = req.params;
    if (!validateEntityKey(entityKey)) {
      return res.status(404).json({ message: "Purchase entity not found." });
    }

    const currentDocumentId = normalize(req.params.id);
    const currentRow = await PurchaseManagementDocument.findOne({
      tenantId: req.auth.tenantId,
      entityKey,
      documentId: currentDocumentId,
    });

    if (!currentRow) {
      return res.status(404).json({ message: "Purchase document not found." });
    }

    const patch = purchaseDocumentPatch({
      ...(currentRow.data || {}),
      ...(req.body || {}),
      id: normalize(req.body?.id) || currentDocumentId,
    });

    const row = await PurchaseManagementDocument.findOneAndUpdate(
      {
        tenantId: req.auth.tenantId,
        entityKey,
        documentId: currentDocumentId,
      },
      {
        $set: {
          ...patch,
          updatedBy: req.auth.sub,
        },
      },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      row: serializePurchaseDocument(row),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Purchase document already exists." });
    }

    next(error);
  }
}
