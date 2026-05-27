export const generateId = (prefix, digits) => {
    let result = prefix;
    for (let i = 0; i < digits; i++) {
        result += Math.floor(Math.random() * 10).toString();
    }
    return result;
};

export const ID_RULES = {
    AUTH_USERS: { prefix: 'TLC-', digits: 6 },
    STORE: { prefix: 'STR-', digits: 4 },
    VOUCHER: { prefix: 'VC-', digits: 8 },
    CUSTOMERS: { prefix: 'LC-', digits: 8 },
    PRODUCTS: { prefix: 'PL-', digits: 6 },
    ORDERS: { prefix: 'OD-', digits: 6 },
    ORDER_ITEMS: { prefix: 'OL-', digits: 8 },
};
