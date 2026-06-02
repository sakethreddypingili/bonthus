/** PostgREST select for invoice pages (order + store + line items). */
export const INVOICE_ORDER_SELECT = `
  *,
  customers(*),
  stores(id, name, phone, address, gst_no, email),
  prescriptions(*),
  order_items(
    *,
    products(
      id,
      name,
      base_price,
      category_id,
      categories(id, name)
    )
  )
`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return UUID_RE.test(String(value || '').trim());
}

export function orderLookupFilter(query, routeKey) {
  const key = decodeURIComponent(String(routeKey || '').trim());
  if (!key) return query;
  return isUuid(key) ? query.eq('id', key) : query.eq('order_number', key);
}

/** Line unit price from order_items row. */
export function lineUnitPrice(item) {
  return Number(item?.unit_price ?? item?.price ?? 0);
}
