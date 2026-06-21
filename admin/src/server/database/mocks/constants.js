export const STORE_LOCATIONS = [
    "All",
    "Madeenaguda, Hyderabad",
    "JNTUH Kukatpally, Hyderabad",
    "Ameerpet, Hyderabad",
    "Puppalguda Manikonda, Hyderabad",
    "Nizampet Kukatpally, Hyderabad",
    "Bachupally, Hyderabad",
    "Nandigama, Andhra Pradesh",
    "Vijayawada, Andhra Pradesh",
    "Vizag, Andhra Pradesh"
];

export const OPERATION_TYPES = [
    { value: 'company', label: 'Executive (MD/AGM)' },
    { value: 'finance', label: 'Finance' },
    { value: 'hr', label: 'Human Resources' },
    { value: 'retail_ops', label: 'Retail Operations' },
    { value: 'warehouse', label: 'Warehouse' }
];

// Special values that trigger unit selection
export const UNIT_BASED_OPERATIONS = ['store', 'lab'];

export const ROLES_BY_OPERATION = {
    company: [
        { value: 'md', label: 'Managing Director / Owner' },
        { value: 'agm', label: 'Assistant General Manager' }
    ],
    finance: [
        { value: 'chief_accountant', label: 'Chief Accountant' },
        { value: 'internal_auditor', label: 'Internal Auditor' },
        { value: 'accounts_executive', label: 'Accounts Executive' }
    ],
    hr: [
        { value: 'hr_manager', label: 'HR Manager / Lead' },
        { value: 'senior_recruiter', label: 'Senior Recruiter' },
        { value: 'compliance_officer', label: 'Compliance Officer' },
        { value: 'hr_associate', label: 'HR Associate' }
    ],
    retail_ops: [
        { value: 'operations_manager', label: 'Operations Manager' },
        { value: 'area_manager', label: 'Area Manager' },
        { value: 'ops_coordinator', label: 'Operations Coordinator' },
        { value: 'store', label: 'Store Operations [Unit Based]' }
    ],
    store: [
        { value: 'assistant_manager', label: 'Assistant Manager' },
        { value: 'optometrist', label: 'Optometrist' },
        { value: 'senior_sales_executive', label: 'Senior Sales Executive' },
        { value: 'sales_executive', label: 'Sales Executive' }
    ],
    warehouse: [
        { value: 'supply_chain_manager', label: 'Supply Chain Manager' },
        { value: 'logistics_coordinator', label: 'Logistics Coordinator' },
        { value: 'dispatch_clerk', label: 'Dispatch Clerk' },
        { value: 'receiving_associate', label: 'Receiving Associate' },
        { value: 'lab', label: 'Lab Operations [Unit Based]' }
    ],
    lab: [
        { value: 'chief_optometrist', label: 'Chief Optometrist' },
        { value: 'lab_technician', label: 'Lab Technician' },
        { value: 'lens_grinder', label: 'Lens Grinder' },
        { value: 'quality_inspector', label: 'Quality Inspector' }
    ]
};

export const USER_ROLES = Object.values(ROLES_BY_OPERATION).flat();

export const ROLES_FOR_SUPER_ADMIN = USER_ROLES;

export const ROLES_FOR_ADMIN = USER_ROLES.filter(r => !['md', 'agm'].includes(r.value));
