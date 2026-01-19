// Invoice Generator - Main Application

// API base URL - use relative path for Netlify Functions
const API_BASE = '/.netlify/functions/notion';

// Cached clients from Notion
let notionClients = [];

// Currency symbols mapping
const CURRENCY_SYMBOLS = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    COP: 'COP$',
    CAD: 'CAD$',
    AUD: 'AUD$',
    MXN: 'MXN$'
};

// Step names for navigation
const STEP_NAMES = {
    1: 'Your company',
    2: 'Your client',
    3: 'Invoice details',
    4: 'Invoice terms'
};

// Application state
const state = {
    currentStep: 1,
    totalSteps: 4,
    company: {
        email: '',
        name: '',
        logo: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        country: '',
        taxId: ''
    },
    client: {
        id: null, // Notion page ID if selected from saved clients
        email: '',
        name: '',
        logo: '', // Can be initial letter or URL
        logoUrl: '', // URL from Notion
        address: '',
        city: '',
        state: '',
        zip: '',
        country: '',
        taxId: ''
    },
    invoice: {
        number: '',
        issueDate: '',
        dueDate: '',
        currency: 'USD',
        note: '',
        customFooter: ''
    },
    lineItems: [
        { description: '', quantity: 1, price: 0 }
    ],
    discount: {
        type: 'none', // 'none', 'percentage', 'fixed'
        value: 0
    },
    tax: {
        enabled: false,
        rate: 0
    }
};

// DOM Elements cache
const elements = {};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    cacheElements();
    loadTheme(); // Load theme before other UI updates
    loadFromLocalStorage();
    setupEventListeners();
    renderLineItems();
    updatePreview();
    setDefaultDates();
    generateInvoiceNumber();
    updatePreviewSections();
    loadClientsFromNotion(); // Load saved clients
});

// Cache DOM elements for performance
function cacheElements() {
    // Step navigation
    elements.prevBtn = document.getElementById('prev-btn');
    elements.nextBtn = document.getElementById('next-btn');
    elements.prevStepName = document.getElementById('prev-step-name');
    elements.nextStepName = document.getElementById('next-step-name');
    elements.currentStepNum = document.getElementById('currentStepNum');
    elements.stepContents = document.querySelectorAll('.step-content');
    elements.stepDots = document.querySelectorAll('.step-dots .dot');

    // Company fields
    elements.companyEmail = document.getElementById('company-email');
    elements.companyName = document.getElementById('company-name');
    elements.companyLogo = document.getElementById('company-logo');
    elements.companyAddress = document.getElementById('company-address');
    elements.companyCity = document.getElementById('company-city');
    elements.companyState = document.getElementById('company-state');
    elements.companyZip = document.getElementById('company-zip');
    elements.companyCountry = document.getElementById('company-country');
    elements.companyTaxId = document.getElementById('company-tax-id');

    // Client selector (Notion integration)
    elements.clientSelector = document.getElementById('client-selector');
    elements.refreshClientsBtn = document.getElementById('refresh-clients-btn');
    elements.saveClientBtn = document.getElementById('save-client-btn');

    // Client fields
    elements.clientEmail = document.getElementById('client-email');
    elements.clientName = document.getElementById('client-name');
    elements.clientLogo = document.getElementById('client-logo');
    elements.clientAddress = document.getElementById('client-address');
    elements.clientCity = document.getElementById('client-city');
    elements.clientState = document.getElementById('client-state');
    elements.clientZip = document.getElementById('client-zip');
    elements.clientCountry = document.getElementById('client-country');
    elements.clientTaxId = document.getElementById('client-tax-id');

    // Invoice fields
    elements.currency = document.getElementById('currency');
    elements.currencyFlag = document.getElementById('currency-flag');
    elements.lineItemsContainer = document.getElementById('line-items-container');
    elements.addItemBtn = document.getElementById('add-item-btn');
    elements.invoiceNote = document.getElementById('invoice-note');
    elements.moreOptionsToggle = document.getElementById('more-options-toggle');
    elements.moreOptions = document.getElementById('more-options');
    elements.discountType = document.getElementById('discount-type');
    elements.discountValueRow = document.getElementById('discount-value-row');
    elements.discountValue = document.getElementById('discount-value');
    elements.taxEnabled = document.getElementById('tax-enabled');
    elements.taxRateRow = document.getElementById('tax-rate-row');
    elements.taxRate = document.getElementById('tax-rate');

    // Invoice terms
    elements.invoiceNumber = document.getElementById('invoice-number');
    elements.issueDate = document.getElementById('issue-date');
    elements.dueDate = document.getElementById('due-date');
    elements.customFooter = document.getElementById('custom-footer');
    elements.downloadPdfBtn = document.getElementById('download-pdf-btn');
    elements.saveInvoiceBtn = document.getElementById('save-invoice-btn');

    // Custom date picker elements
    elements.issueDateTrigger = document.getElementById('issue-date-trigger');
    elements.issueDateDropdown = document.getElementById('issue-date-dropdown');
    elements.issueDateText = document.getElementById('issue-date-text');
    elements.dueDateTrigger = document.getElementById('due-date-trigger');
    elements.dueDateDropdown = document.getElementById('due-date-dropdown');
    elements.dueDateText = document.getElementById('due-date-text');

    // Preview elements
    elements.previewInvoiceNumber = document.getElementById('preview-invoice-number');
    elements.previewIssueDate = document.getElementById('preview-issue-date');
    elements.previewDueDate = document.getElementById('preview-due-date');
    elements.previewCompanyLogo = document.getElementById('preview-company-logo');
    elements.previewCompanyName = document.getElementById('preview-company-name');
    elements.previewCompanyEmail = document.getElementById('preview-company-email');
    elements.previewCompanyAddress = document.getElementById('preview-company-address');
    elements.previewClientLogo = document.getElementById('preview-client-logo');
    elements.previewClientName = document.getElementById('preview-client-name');
    elements.previewClientEmail = document.getElementById('preview-client-email');
    elements.previewClientAddress = document.getElementById('preview-client-address');
    elements.previewLineItems = document.getElementById('preview-line-items');
    elements.previewNote = document.getElementById('preview-note');
    elements.previewSubtotal = document.getElementById('preview-subtotal');
    elements.previewDiscountRow = document.getElementById('preview-discount-row');
    elements.previewDiscountLabel = document.getElementById('preview-discount-label');
    elements.previewDiscount = document.getElementById('preview-discount');
    elements.previewTaxRow = document.getElementById('preview-tax-row');
    elements.previewTaxLabel = document.getElementById('preview-tax-label');
    elements.previewTax = document.getElementById('preview-tax');
    elements.previewTotal = document.getElementById('preview-total');
    elements.previewWatermark = document.getElementById('preview-watermark');

    // Preview sections (clickable areas)
    elements.previewSections = document.querySelectorAll('.preview-section');
    elements.invoicePaper = document.getElementById('invoice-preview');

    // Theme toggle
    elements.themeToggle = document.getElementById('theme-toggle');
}

// Setup all event listeners
function setupEventListeners() {
    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);

    // Navigation
    elements.prevBtn.addEventListener('click', goToPrevStep);
    elements.nextBtn.addEventListener('click', goToNextStep);

    // Company fields
    elements.companyEmail.addEventListener('input', (e) => updateState('company', 'email', e.target.value));
    elements.companyName.addEventListener('input', (e) => updateState('company', 'name', e.target.value));
    elements.companyLogo.addEventListener('input', (e) => updateState('company', 'logo', e.target.value));
    elements.companyAddress.addEventListener('input', (e) => updateState('company', 'address', e.target.value));
    elements.companyCity.addEventListener('input', (e) => updateState('company', 'city', e.target.value));
    elements.companyState.addEventListener('input', (e) => updateState('company', 'state', e.target.value));
    elements.companyZip.addEventListener('input', (e) => updateState('company', 'zip', e.target.value));
    elements.companyCountry.addEventListener('input', (e) => updateState('company', 'country', e.target.value));
    elements.companyTaxId.addEventListener('input', (e) => updateState('company', 'taxId', e.target.value));

    // Client fields
    elements.clientEmail.addEventListener('input', (e) => updateState('client', 'email', e.target.value));
    elements.clientName.addEventListener('input', (e) => updateState('client', 'name', e.target.value));
    elements.clientLogo.addEventListener('input', (e) => updateState('client', 'logo', e.target.value));
    elements.clientAddress.addEventListener('input', (e) => updateState('client', 'address', e.target.value));
    elements.clientCity.addEventListener('input', (e) => updateState('client', 'city', e.target.value));
    elements.clientState.addEventListener('input', (e) => updateState('client', 'state', e.target.value));
    elements.clientZip.addEventListener('input', (e) => updateState('client', 'zip', e.target.value));
    elements.clientCountry.addEventListener('input', (e) => updateState('client', 'country', e.target.value));
    elements.clientTaxId.addEventListener('input', (e) => updateState('client', 'taxId', e.target.value));

    // Invoice fields
    elements.currency.addEventListener('change', (e) => {
        state.invoice.currency = e.target.value;
        // Update flag emoji
        const selectedOption = e.target.options[e.target.selectedIndex];
        const flag = selectedOption.dataset.flag;
        if (elements.currencyFlag && flag) {
            elements.currencyFlag.textContent = flag;
        }
        updatePreview();
    });
    elements.invoiceNote.addEventListener('input', (e) => {
        state.invoice.note = e.target.value;
        updatePreview();
    });

    // More options toggle
    elements.moreOptionsToggle.addEventListener('click', toggleMoreOptions);

    // Discount
    elements.discountType.addEventListener('change', (e) => {
        state.discount.type = e.target.value;
        elements.discountValueRow.classList.toggle('hidden', e.target.value === 'none');
        updatePreview();
    });
    elements.discountValue.addEventListener('input', (e) => {
        state.discount.value = parseFloat(e.target.value) || 0;
        updatePreview();
    });

    // Tax
    elements.taxEnabled.addEventListener('change', (e) => {
        state.tax.enabled = e.target.checked;
        elements.taxRateRow.classList.toggle('hidden', !e.target.checked);
        updatePreview();
    });
    elements.taxRate.addEventListener('input', (e) => {
        state.tax.rate = parseFloat(e.target.value) || 0;
        updatePreview();
    });

    // Invoice terms
    elements.invoiceNumber.addEventListener('input', (e) => {
        state.invoice.number = e.target.value;
        updatePreview();
    });
    elements.customFooter.addEventListener('input', (e) => {
        state.invoice.customFooter = e.target.value;
        updatePreview();
    });

    // Custom date pickers
    setupDatePicker('issue-date', elements.issueDateTrigger, elements.issueDateDropdown, elements.issueDateText, (value) => {
        state.invoice.issueDate = value;
        elements.issueDate.value = value;
        updatePreview();
    });
    setupDatePicker('due-date', elements.dueDateTrigger, elements.dueDateDropdown, elements.dueDateText, (value) => {
        state.invoice.dueDate = value;
        elements.dueDate.value = value;
        updatePreview();
    });

    // Add line item
    elements.addItemBtn.addEventListener('click', addLineItem);

    // Download PDF
    elements.downloadPdfBtn.addEventListener('click', downloadPDF);

    // Notion integration
    elements.clientSelector.addEventListener('change', handleClientSelection);
    elements.refreshClientsBtn.addEventListener('click', loadClientsFromNotion);
    elements.saveClientBtn.addEventListener('click', saveClientToNotion);
    elements.saveInvoiceBtn.addEventListener('click', saveInvoiceToNotion);

    // Preview section clicks (navigate to step)
    elements.previewSections.forEach(section => {
        section.addEventListener('click', () => {
            const step = parseInt(section.dataset.step);
            goToStep(step);
        });
    });
}

// State management
function updateState(section, field, value) {
    state[section][field] = value;

    // Save company info to localStorage
    if (section === 'company') {
        saveToLocalStorage();
    }

    updatePreview();
}

// Step navigation
function goToNextStep() {
    if (state.currentStep < state.totalSteps) {
        state.currentStep++;
        updateStepUI();
    }
}

function goToPrevStep() {
    if (state.currentStep > 1) {
        state.currentStep--;
        updateStepUI();
    }
}

function goToStep(step) {
    if (step >= 1 && step <= state.totalSteps) {
        state.currentStep = step;
        updateStepUI();
    }
}

function updateStepUI() {
    // Update step content visibility
    elements.stepContents.forEach(content => {
        const step = parseInt(content.dataset.step);
        content.classList.toggle('active', step === state.currentStep);
    });

    // Update step dots
    elements.stepDots.forEach(dot => {
        const step = parseInt(dot.dataset.step);
        dot.classList.toggle('active', step === state.currentStep);
        dot.classList.toggle('completed', step < state.currentStep);
    });

    // Update step number text
    elements.currentStepNum.textContent = state.currentStep;

    // Update navigation buttons visibility
    elements.prevBtn.classList.toggle('hidden', state.currentStep === 1);
    elements.nextBtn.classList.toggle('hidden', state.currentStep === state.totalSteps);

    // Update navigation button step names
    if (state.currentStep > 1) {
        elements.prevStepName.textContent = STEP_NAMES[state.currentStep - 1];
    }
    if (state.currentStep < state.totalSteps) {
        elements.nextStepName.textContent = STEP_NAMES[state.currentStep + 1];
    }

    // Update preview sections highlighting
    updatePreviewSections();
}

// Update preview section highlights based on current step
function updatePreviewSections() {
    elements.previewSections.forEach(section => {
        const step = parseInt(section.dataset.step);
        section.classList.toggle('active', step === state.currentStep);
    });
}

// Line items management
function renderLineItems() {
    elements.lineItemsContainer.innerHTML = '';

    state.lineItems.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'line-item-row';
        row.innerHTML = `
            <input type="text" class="item-description" placeholder="Description" value="${escapeHtml(item.description)}" data-index="${index}" data-field="description">
            <input type="number" class="item-qty" placeholder="Qty" value="${item.quantity}" min="1" data-index="${index}" data-field="quantity">
            <input type="number" class="item-price" placeholder="Price" value="${item.price || ''}" min="0" step="0.01" data-index="${index}" data-field="price">
            <button type="button" class="remove-item-btn" data-index="${index}" ${state.lineItems.length === 1 ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''}>×</button>
        `;
        elements.lineItemsContainer.appendChild(row);
    });

    // Add event listeners to line item inputs
    elements.lineItemsContainer.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', handleLineItemInput);
    });

    // Add event listeners to remove buttons
    elements.lineItemsContainer.querySelectorAll('.remove-item-btn').forEach(btn => {
        btn.addEventListener('click', handleRemoveLineItem);
    });
}

function handleLineItemInput(e) {
    const index = parseInt(e.target.dataset.index);
    const field = e.target.dataset.field;
    let value = e.target.value;

    if (field === 'quantity' || field === 'price') {
        value = parseFloat(value) || 0;
    }

    state.lineItems[index][field] = value;
    updatePreview();
}

function handleRemoveLineItem(e) {
    if (state.lineItems.length > 1) {
        const index = parseInt(e.target.dataset.index);
        state.lineItems.splice(index, 1);
        renderLineItems();
        updatePreview();
    }
}

function addLineItem() {
    state.lineItems.push({ description: '', quantity: 1, price: 0 });
    renderLineItems();

    // Focus the new description input
    const inputs = elements.lineItemsContainer.querySelectorAll('input[data-field="description"]');
    inputs[inputs.length - 1].focus();
}

// More options toggle
function toggleMoreOptions() {
    elements.moreOptionsToggle.classList.toggle('open');
    elements.moreOptions.classList.toggle('hidden');
}

// Calculations
function calculateSubtotal() {
    return state.lineItems.reduce((sum, item) => {
        return sum + (item.quantity * item.price);
    }, 0);
}

function calculateDiscount(subtotal) {
    if (state.discount.type === 'none') return 0;
    if (state.discount.type === 'percentage') {
        return subtotal * (state.discount.value / 100);
    }
    return state.discount.value; // fixed amount
}

function calculateTax(subtotalAfterDiscount) {
    if (!state.tax.enabled) return 0;
    return subtotalAfterDiscount * (state.tax.rate / 100);
}

function calculateTotal() {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount(subtotal);
    const subtotalAfterDiscount = subtotal - discount;
    const tax = calculateTax(subtotalAfterDiscount);
    return subtotalAfterDiscount + tax;
}

// Format currency
function formatCurrency(amount) {
    const symbol = CURRENCY_SYMBOLS[state.invoice.currency] || '$';
    return `${symbol}${amount.toFixed(2)}`;
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: '2-digit'
    });
}

// Update preview
function updatePreview() {
    // Invoice meta
    elements.previewInvoiceNumber.textContent = state.invoice.number || '0001';
    elements.previewIssueDate.textContent = formatDate(state.invoice.issueDate);
    elements.previewDueDate.textContent = formatDate(state.invoice.dueDate);

    // Company (FROM)
    elements.previewCompanyLogo.textContent = state.company.logo || state.company.name?.charAt(0) || 'C';
    elements.previewCompanyName.textContent = state.company.name || 'Your Company';
    elements.previewCompanyEmail.textContent = state.company.email || 'contact@example.com';
    elements.previewCompanyAddress.innerHTML = formatAddress(state.company);

    // Client (TO)
    if (state.client.logoUrl) {
        // Show image logo with crossorigin for PDF export
        elements.previewClientLogo.innerHTML = `<img src="${state.client.logoUrl}" alt="${escapeHtml(state.client.name)}" crossorigin="anonymous" />`;
        elements.previewClientLogo.classList.add('has-image');
    } else {
        // Show initial letter
        elements.previewClientLogo.textContent = state.client.logo || state.client.name?.charAt(0) || 'C';
        elements.previewClientLogo.classList.remove('has-image');
    }
    elements.previewClientName.textContent = state.client.name || 'Client Company';
    elements.previewClientEmail.textContent = state.client.email || 'client@example.com';
    elements.previewClientAddress.innerHTML = formatAddress(state.client, true);

    // Line items
    elements.previewLineItems.innerHTML = state.lineItems.map(item => `
        <div class="table-row">
            <span class="item-name">${escapeHtml(item.description) || '-'}</span>
            <span class="text-right">${item.quantity}</span>
            <span class="text-right">${formatCurrency(item.price)}</span>
            <span class="text-right">${formatCurrency(item.quantity * item.price)}</span>
        </div>
    `).join('');

    // Note
    elements.previewNote.textContent = state.invoice.note || '-';

    // Calculations
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount(subtotal);
    const subtotalAfterDiscount = subtotal - discount;
    const tax = calculateTax(subtotalAfterDiscount);
    const total = subtotalAfterDiscount + tax;

    elements.previewSubtotal.textContent = formatCurrency(subtotal);

    // Discount row
    if (state.discount.type !== 'none' && state.discount.value > 0) {
        elements.previewDiscountRow.classList.remove('hidden');
        const discountLabel = state.discount.type === 'percentage'
            ? `Discount (${state.discount.value}%)`
            : 'Discount';
        elements.previewDiscountLabel.textContent = discountLabel;
        elements.previewDiscount.textContent = `-${formatCurrency(discount)}`;
    } else {
        elements.previewDiscountRow.classList.add('hidden');
    }

    // Tax row
    if (state.tax.enabled && state.tax.rate > 0) {
        elements.previewTaxRow.classList.remove('hidden');
        elements.previewTaxLabel.textContent = `Tax (${state.tax.rate}%)`;
        elements.previewTax.textContent = formatCurrency(tax);
    } else {
        elements.previewTaxRow.classList.add('hidden');
    }

    elements.previewTotal.textContent = formatCurrency(total);

    // Watermark
    if (state.invoice.customFooter) {
        elements.previewWatermark.innerHTML = escapeHtml(state.invoice.customFooter);
    } else {
        elements.previewWatermark.innerHTML = 'Powered by <strong>Pixoagency.com</strong>';
    }
}

// Format address for preview
function formatAddress(entity, includeTaxId = false) {
    const parts = [];

    if (entity.address) parts.push(escapeHtml(entity.address));

    const cityStateZip = [entity.city, entity.state, entity.zip]
        .filter(Boolean)
        .map(escapeHtml)
        .join(', ');
    if (cityStateZip) parts.push(cityStateZip);

    if (entity.country) parts.push(escapeHtml(entity.country));

    if (includeTaxId && entity.taxId) {
        parts.push(`Tax ID: ${escapeHtml(entity.taxId)}`);
    }

    return parts.join('<br>') || 'Address';
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Set default dates
function setDefaultDates() {
    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 30); // Default 30 days from now

    const formatDateForInput = (date) => date.toISOString().split('T')[0];

    const issueDateValue = formatDateForInput(today);
    const dueDateValue = formatDateForInput(dueDate);

    elements.issueDate.value = issueDateValue;
    elements.dueDate.value = dueDateValue;

    state.invoice.issueDate = issueDateValue;
    state.invoice.dueDate = dueDateValue;

    // Update custom date picker displays
    elements.issueDateText.textContent = formatDateDisplay(issueDateValue);
    elements.dueDateText.textContent = formatDateDisplay(dueDateValue);
}

// Format date for display in trigger (e.g., "January 06, 2026")
function formatDateDisplay(dateString) {
    if (!dateString) return 'Select date';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
        month: 'long',
        day: '2-digit',
        year: 'numeric'
    });
}

// Generate invoice number
function generateInvoiceNumber() {
    const savedNumber = localStorage.getItem('lastInvoiceNumber');
    const nextNumber = savedNumber ? parseInt(savedNumber) + 1 : 1;
    const paddedNumber = String(nextNumber).padStart(4, '0');

    elements.invoiceNumber.value = paddedNumber;
    state.invoice.number = paddedNumber;
}

// LocalStorage management
function saveToLocalStorage() {
    localStorage.setItem('invoiceGenerator_company', JSON.stringify(state.company));
}

function loadFromLocalStorage() {
    const savedCompany = localStorage.getItem('invoiceGenerator_company');
    if (savedCompany) {
        try {
            const company = JSON.parse(savedCompany);
            state.company = { ...state.company, ...company };

            // Populate form fields
            elements.companyEmail.value = state.company.email || '';
            elements.companyName.value = state.company.name || '';
            elements.companyLogo.value = state.company.logo || '';
            elements.companyAddress.value = state.company.address || '';
            elements.companyCity.value = state.company.city || '';
            elements.companyState.value = state.company.state || '';
            elements.companyZip.value = state.company.zip || '';
            elements.companyCountry.value = state.company.country || '';
            elements.companyTaxId.value = state.company.taxId || '';
        } catch (e) {
            console.error('Error loading company data from localStorage:', e);
        }
    }
}

// Theme management
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('invoiceGenerator_theme', isDark ? 'dark' : 'light');
}

function loadTheme() {
    const savedTheme = localStorage.getItem('invoiceGenerator_theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
}

// Convert image URL to base64 for PDF export using our proxy
async function imageToBase64(url) {
    try {
        // Use our serverless function to proxy the image and return base64
        const response = await fetch(`${API_BASE}?action=proxyImage&url=${encodeURIComponent(url)}`);
        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }
        return data.dataUrl;
    } catch (error) {
        console.error('Error converting image to base64:', error);
        return null;
    }
}

// PDF Download using html2pdf.js (loaded dynamically)
async function downloadPDF() {
    // Show loading state
    const originalText = elements.downloadPdfBtn.textContent;
    elements.downloadPdfBtn.textContent = 'Generating...';
    elements.downloadPdfBtn.disabled = true;

    try {
        // Load html2pdf if not already loaded
        if (!window.html2pdf) {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
        }

        const invoice = document.getElementById('invoice-preview');
        const invoiceNumber = state.invoice.number || '0001';
        const clientName = state.client.name || 'Client';

        // Convert client logo to base64 if it's an external URL
        let originalLogoSrc = null;
        const logoImg = elements.previewClientLogo.querySelector('img');
        if (logoImg && state.client.logoUrl) {
            originalLogoSrc = logoImg.src;
            const base64Logo = await imageToBase64(state.client.logoUrl);
            if (base64Logo) {
                logoImg.src = base64Logo;
            }
        }

        // Add pdf-export class to hide interactive elements
        invoice.classList.add('pdf-export');

        const opt = {
            margin: 10,
            filename: `Invoice_${invoiceNumber}_${clientName.replace(/\s+/g, '_')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, allowTaint: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        await html2pdf().set(opt).from(invoice).save();

        // Remove pdf-export class
        invoice.classList.remove('pdf-export');

        // Restore original logo src if we changed it
        if (logoImg && originalLogoSrc) {
            logoImg.src = originalLogoSrc;
        }

        // Save invoice number for next time
        localStorage.setItem('lastInvoiceNumber', parseInt(state.invoice.number) || 1);

    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please try again.');
        // Ensure class is removed even on error
        document.getElementById('invoice-preview').classList.remove('pdf-export');
    } finally {
        elements.downloadPdfBtn.textContent = originalText;
        elements.downloadPdfBtn.disabled = false;
    }
}

// Load external script dynamically
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Custom Date Picker
const datePickerState = {};

function setupDatePicker(id, trigger, dropdown, textEl, onSelect) {
    datePickerState[id] = {
        currentMonth: new Date(),
        selectedDate: null,
        isOpen: false
    };

    // Toggle dropdown on trigger click
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('open');

        // Close all other date pickers
        document.querySelectorAll('.date-picker-dropdown.open').forEach(d => {
            d.classList.remove('open');
        });
        document.querySelectorAll('.date-picker-trigger.open').forEach(t => {
            t.classList.remove('open');
        });

        if (!isOpen) {
            dropdown.classList.add('open');
            trigger.classList.add('open');
            datePickerState[id].isOpen = true;
            renderDatePicker(id, dropdown, textEl, onSelect);
        } else {
            datePickerState[id].isOpen = false;
        }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !trigger.contains(e.target)) {
            dropdown.classList.remove('open');
            trigger.classList.remove('open');
            datePickerState[id].isOpen = false;
        }
    });
}

function renderDatePicker(id, dropdown, textEl, onSelect) {
    const state = datePickerState[id];
    const year = state.currentMonth.getFullYear();
    const month = state.currentMonth.getMonth();

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    // Get first day of month and total days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Today for comparison
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    let html = `
        <div class="date-picker-header">
            <span class="month-year">${monthNames[month]} ${year}</span>
            <div class="nav-arrows">
                <button type="button" data-action="prev">&lsaquo;</button>
                <button type="button" data-action="next">&rsaquo;</button>
            </div>
        </div>
        <div class="date-picker-weekdays">
            ${dayNames.map(d => `<span>${d}</span>`).join('')}
        </div>
        <div class="date-picker-days">
    `;

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        html += `<button type="button" class="other-month" data-date="${dateStr}">${day}</button>`;
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        let classes = [];
        if (dateStr === todayStr) classes.push('today');
        if (dateStr === state.selectedDate) classes.push('selected');
        html += `<button type="button" class="${classes.join(' ')}" data-date="${dateStr}">${day}</button>`;
    }

    // Next month days
    const totalCells = firstDay + daysInMonth;
    const remainingCells = totalCells > 35 ? 42 - totalCells : 35 - totalCells;
    for (let day = 1; day <= remainingCells; day++) {
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        html += `<button type="button" class="other-month" data-date="${dateStr}">${day}</button>`;
    }

    html += '</div>';
    dropdown.innerHTML = html;

    // Add event listeners
    dropdown.querySelector('[data-action="prev"]').addEventListener('click', (e) => {
        e.stopPropagation();
        state.currentMonth.setMonth(state.currentMonth.getMonth() - 1);
        renderDatePicker(id, dropdown, textEl, onSelect);
    });

    dropdown.querySelector('[data-action="next"]').addEventListener('click', (e) => {
        e.stopPropagation();
        state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
        renderDatePicker(id, dropdown, textEl, onSelect);
    });

    dropdown.querySelectorAll('.date-picker-days button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const dateStr = btn.dataset.date;
            state.selectedDate = dateStr;
            textEl.textContent = formatDateDisplay(dateStr);
            dropdown.classList.remove('open');
            dropdown.parentElement.querySelector('.date-picker-trigger').classList.remove('open');
            state.isOpen = false;
            onSelect(dateStr);
        });
    });
}

// ==========================================
// NOTION INTEGRATION
// ==========================================

// Show toast notification
function showToast(message, type = 'success') {
    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Load clients from Notion
async function loadClientsFromNotion() {
    const refreshBtn = elements.refreshClientsBtn;
    refreshBtn.classList.add('loading');

    try {
        const response = await fetch(`${API_BASE}?action=getClients`);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        notionClients = data.clients || [];
        renderClientSelector();

        if (notionClients.length > 0) {
            showToast(`Loaded ${notionClients.length} client(s) from Notion`);
        }
    } catch (error) {
        console.error('Error loading clients:', error);
        showToast('Could not load clients from Notion', 'error');
    } finally {
        refreshBtn.classList.remove('loading');
    }
}

// Render client selector dropdown
function renderClientSelector() {
    const select = elements.clientSelector;

    // Clear existing options except the first one
    while (select.options.length > 1) {
        select.remove(1);
    }

    // Add client options
    notionClients.forEach(client => {
        const option = document.createElement('option');
        option.value = client.id;
        option.textContent = client.name || 'Unnamed Client';
        select.appendChild(option);
    });
}

// Handle client selection from dropdown
function handleClientSelection(e) {
    const clientId = e.target.value;

    if (!clientId) {
        // "Select a client..." was chosen, clear fields
        state.client.id = null;
        return;
    }

    const client = notionClients.find(c => c.id === clientId);
    if (!client) return;

    // Populate client fields
    state.client.id = client.id;
    state.client.name = client.name || '';
    state.client.email = client.email || '';
    state.client.address = client.address || '';
    state.client.city = client.city || '';
    state.client.state = client.state || '';
    state.client.zip = client.zipCode || '';
    state.client.country = client.country || '';
    state.client.logoUrl = client.logo || '';

    // Update form fields
    elements.clientName.value = state.client.name;
    elements.clientEmail.value = state.client.email;
    elements.clientAddress.value = state.client.address;
    elements.clientCity.value = state.client.city;
    elements.clientState.value = state.client.state;
    elements.clientZip.value = state.client.zip;
    elements.clientCountry.value = state.client.country;

    // Update preview
    updatePreview();

    showToast(`Loaded client: ${client.name}`);
}

// Save current client to Notion
async function saveClientToNotion() {
    const btn = elements.saveClientBtn;
    const originalText = btn.innerHTML;

    // Validate that we have at least a name
    if (!state.client.name.trim()) {
        showToast('Please enter a client name first', 'error');
        return;
    }

    btn.classList.add('btn-loading');
    btn.innerHTML = 'Saving...';

    try {
        const response = await fetch(`${API_BASE}?action=createClient`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: state.client.name,
                email: state.client.email,
                address: state.client.address,
                city: state.client.city,
                state: state.client.state,
                zipCode: state.client.zip,
                country: state.client.country
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        // Update client ID with the new Notion page ID
        state.client.id = data.client.id;

        // Refresh the client list
        await loadClientsFromNotion();

        // Select the newly created client
        elements.clientSelector.value = data.client.id;

        showToast(`Client "${state.client.name}" saved to Notion!`);
    } catch (error) {
        console.error('Error saving client:', error);
        showToast('Could not save client to Notion', 'error');
    } finally {
        btn.classList.remove('btn-loading');
        btn.innerHTML = originalText;
    }
}

// Save invoice to Notion
async function saveInvoiceToNotion() {
    const btn = elements.saveInvoiceBtn;
    const originalHTML = btn.innerHTML;

    btn.classList.add('btn-loading');
    btn.innerHTML = 'Saving...';

    try {
        // Format line items as text
        const lineItemsText = state.lineItems
            .filter(item => item.description)
            .map(item => `${item.description} (${item.quantity} x ${formatCurrency(item.price)})`)
            .join('\n');

        const subtotal = calculateSubtotal();
        const discount = calculateDiscount(subtotal);
        const subtotalAfterDiscount = subtotal - discount;
        const taxAmount = calculateTax(subtotalAfterDiscount);
        const total = subtotalAfterDiscount + taxAmount;

        const invoiceData = {
            invoiceNumber: state.invoice.number || 'INV-0001',
            clientId: state.client.id || null,
            issueDate: state.invoice.issueDate,
            dueDate: state.invoice.dueDate,
            lineItems: lineItemsText,
            subtotal: subtotal,
            taxRate: state.tax.enabled ? state.tax.rate : 0,
            taxAmount: taxAmount,
            total: total,
            currency: state.invoice.currency,
            status: 'Draft',
            notes: state.invoice.note,
            customFooter: state.invoice.customFooter
        };

        const response = await fetch(`${API_BASE}?action=saveInvoice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invoiceData)
        });

        const data = await response.json();
        console.log('Save invoice response:', data);

        if (data.error) {
            throw new Error(data.error);
        }

        if (!data.success) {
            throw new Error('Failed to save invoice');
        }

        showToast(`Invoice ${state.invoice.number} saved to Notion!`);
    } catch (error) {
        console.error('Error saving invoice:', error);
        showToast(`Error: ${error.message}`, 'error');
    } finally {
        btn.classList.remove('btn-loading');
        btn.innerHTML = originalHTML;
    }
}
