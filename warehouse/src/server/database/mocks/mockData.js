// Mock data for LensCare Admin Dashboard
// This file contains all the data used by the redesigned dashboard pages

export const revenueData = [
  { month:"Apr", revenue: 42000, orders: 210 },
  { month:"May", revenue: 48500, orders: 245 },
  { month:"Jun", revenue: 45200, orders: 228 },
  { month:"Jul", revenue: 52800, orders: 264 },
  { month:"Aug", revenue: 58300, orders: 291 },
  { month:"Sep", revenue: 61200, orders: 306 },
  { month:"Oct", revenue: 67500, orders: 338 },
  { month:"Nov", revenue: 73800, orders: 369 },
  { month:"Dec", revenue: 89400, orders: 447 },
  { month:"Jan", revenue: 71200, orders: 356 },
  { month:"Feb", revenue: 78600, orders: 393 },
  { month:"Mar", revenue: 82400, orders: 412 },
];

export const categoryData = [
  { name:"Eyeglasses", value: 42, color:"#000000" },
  { name:"Sunglasses", value: 31, color:"#333333" },
  { name:"Contact Lenses", value: 18, color:"#FF5E00" },
  { name:"Accessories", value: 9, color:"#FFD700" },
];

export const recentOrders = [
  { id:"LC-8821", customer:"Arjun Mehta",     product:"Classic Aviator Gold",       category:"Sunglasses",    amount: 2499, status:"Delivered",  date:"05 Mar 2026" },
  { id:"LC-8820", customer:"Priya Sharma",    product:"Round Frame Blue Light",      category:"Eyeglasses",   amount: 1899, status:"Processing", date:"05 Mar 2026" },
  { id:"LC-8819", customer:"Rohit Kumar",     product:"Wayfarer Black",              category:"Sunglasses",   amount: 3299, status:"Shipped",    date:"04 Mar 2026" },
  { id:"LC-8818", customer:"Sneha Patel",     product:"Cat Eye Tortoise",           category:"Eyeglasses",   amount: 2199, status:"Delivered",  date:"04 Mar 2026" },
  { id:"LC-8817", customer:"Vikram Singh",    product:"Daily Disposable 30-pack",   category:"Contact Lens",  amount: 899,  status:"Cancelled",  date:"03 Mar 2026" },
  { id:"LC-8816", customer:"Ananya Iyer",     product:"Titanium Rimless",           category:"Eyeglasses",   amount: 4599, status:"Delivered",  date:"03 Mar 2026" },
  { id:"LC-8815", customer:"Kiran Reddy",     product:"Sports Wrap Polarized",      category:"Sunglasses",   amount: 2799, status:"Processing", date:"02 Mar 2026" },
  { id:"LC-8814", customer:"Meera Nair",      product:"Kids Shield Frame",          category:"Eyeglasses",   amount: 1299, status:"Shipped",    date:"02 Mar 2026" },
];

export const topProducts = [
  { name:"Classic Aviator Gold",     category:"Sunglasses",  sales: 487, revenue: 121563, trend:"up" },
  { name:"Round Frame Blue Light",   category:"Eyeglasses",  sales: 412, revenue: 78188,  trend:"up" },
  { name:"Wayfarer Black",           category:"Sunglasses",  sales: 398, revenue: 131202, trend:"up" },
  { name:"Daily Disposable 30-pack", category:"Contact Lens",sales: 356, revenue: 32044,  trend:"up" },
  { name:"Titanium Rimless",         category:"Eyeglasses",  sales: 289, revenue: 132911, trend:"up" },
];

export const customers = [
  { id:"C-001", name:"Arjun Mehta",   email:"arjun.mehta@gmail.com",    phone:"+91 98765 43210", city:"Mumbai",    orders: 8,  spent: 18420, joined:"Jan 2025", status:"VIP"      },
  { id:"C-002", name:"Priya Sharma",  email:"priya.sharma@gmail.com",    phone:"+91 87654 32109", city:"Delhi",     orders: 5,  spent: 9230,  joined:"Mar 2025", status:"Regular"  },
  { id:"C-003", name:"Rohit Kumar",   email:"rohit.kumar@gmail.com",     phone:"+91 76543 21098", city:"Bangalore", orders: 12, spent: 34700, joined:"Oct 2024", status:"VIP"      },
  { id:"C-004", name:"Sneha Patel",   email:"sneha.patel@gmail.com",     phone:"+91 65432 10987", city:"Ahmedabad", orders: 3,  spent: 4800,  joined:"Feb 2026", status:"New"      },
  { id:"C-005", name:"Vikram Singh",  email:"vikram.singh@gmail.com",    phone:"+91 54321 09876", city:"Hyderabad", orders: 7,  spent: 15600, joined:"Jun 2025", status:"Regular"  },
  { id:"C-006", name:"Ananya Iyer",   email:"ananya.iyer@gmail.com",     phone:"+91 43210 98765", city:"Chennai",   orders: 15, spent: 48200, joined:"Aug 2024", status:"VIP"      },
  { id:"C-007", name:"Kiran Reddy",   email:"kiran.reddy@gmail.com",     phone:"+91 32109 87654", city:"Pune",      orders: 4,  spent: 7100,  joined:"Jan 2026", status:"Regular"  },
  { id:"C-008", name:"Meera Nair",    email:"meera.nair@gmail.com",      phone:"+91 21098 76543", city:"Kochi",     orders: 6,  spent: 11800, joined:"Sep 2025", status:"Regular"  },
  { id:"C-009", name:"Rahul Gupta",   email:"rahul.gupta@gmail.com",     phone:"+91 10987 65432", city:"Jaipur",    orders: 2,  spent: 2600,  joined:"Mar 2026", status:"New"      },
  { id:"C-010", name:"Divya Menon",   email:"divya.menon@gmail.com",     phone:"+91 90876 54321", city:"Kolkata",   orders: 9,  spent: 22400, joined:"Nov 2024", status:"VIP"      },
];

export const allOrders = [
  ...recentOrders,
  { id:"LC-8813", customer:"Rahul Gupta",    product:"Acetate Square Frame",       category:"Eyeglasses",   amount: 2099, status:"Delivered",  date:"01 Mar 2026" },
  { id:"LC-8812", customer:"Divya Menon",    product:"Gradient Lens Butterfly",    category:"Sunglasses",   amount: 3499, status:"Delivered",  date:"01 Mar 2026" },
  { id:"LC-8811", customer:"Arjun Mehta",    product:"Monthly Toric Lenses",       category:"Contact Lens",  amount: 1299, status:"Shipped",    date:"28 Feb 2026" },
  { id:"LC-8810", customer:"Priya Sharma",   product:"Kids Round Pink",            category:"Eyeglasses",   amount: 1499, status:"Processing", date:"28 Feb 2026" },
  { id:"LC-8809", customer:"Rohit Kumar",    product:"Hexagonal Metal Frame",      category:"Sunglasses",   amount: 4199, status:"Delivered",  date:"27 Feb 2026" },
  { id:"LC-8808", customer:"Sneha Patel",    product:"Clip-on Magnetic Sunglass",  category:"Accessories",   amount: 899,  status:"Delivered",  date:"27 Feb 2026" },
];

export const allProducts = [
  { id:"P-001", name:"Classic Aviator Gold",     category:"Sunglasses",   price: 2499, stock: 142, sales: 487, status:"Active",   image:"🕶️" },
  { id:"P-002", name:"Round Frame Blue Light",   category:"Eyeglasses",  price: 1899, stock: 89,  sales: 412, status:"Active",   image:"👓" },
  { id:"P-003", name:"Wayfarer Black",           category:"Sunglasses",   price: 3299, stock: 56,  sales: 398, status:"Active",   image:"🕶️" },
  { id:"P-004", name:"Daily Disposable 30-pack", category:"Contact Lens", price: 899,  stock: 320, sales: 356, status:"Active",   image:"👁️" },
  { id:"P-005", name:"Titanium Rimless",         category:"Eyeglasses",  price: 4599, stock: 34,  sales: 289, status:"Active",   image:"👓" },
  { id:"P-006", name:"Cat Eye Tortoise",        category:"Eyeglasses",  price: 2199, stock: 67,  sales: 241, status:"Active",   image:"👓" },
  { id:"P-007", name:"Sports Wrap Polarized",    category:"Sunglasses",   price: 2799, stock: 23,  sales: 198, status:"Low Stock",image:"🕶️" },
  { id:"P-008", name:"Kids Shield Frame",       category:"Eyeglasses",  price: 1299, stock: 0,   sales: 176, status:"Out of Stock", image:"👓" },
  { id:"P-009", name:"Monthly Toric Lenses",    category:"Contact Lens", price: 1299, stock: 210, sales: 162, status:"Active",   image:"👁️" },
  { id:"P-010", name:"Gradient Lens Butterfly", category:"Sunglasses",   price: 3499, stock: 45,  sales: 149, status:"Active",   image:"🕶️" },
  { id:"P-011", name:"Clip-on Magnetic",        category:"Accessories",  price: 899,  stock: 88,  sales: 134, status:"Active",   image:"🔗" },
  { id:"P-012", name:"Acetate Square Frame",    category:"Eyeglasses",  price: 2099, stock: 12,  sales: 118, status:"Low Stock",image:"👓" },
];

export const weeklyOrdersData = [
  { day:"Mon", orders: 42 },
  { day:"Tue", orders: 58 },
  { day:"Wed", orders: 51 },
  { day:"Thu", orders: 67 },
  { day:"Fri", orders: 89 },
  { day:"Sat", orders: 94 },
  { day:"Sun", orders: 72 },
];
