/**
 * Osmoha Company - Interactive Car Rental & Fleet Dashboard Engine
 * Shirkadda Kireynta Baabuurta ee Soomaaliya
 */

// Application State with LocalStorage Persistence
const state = {
  cars: JSON.parse(localStorage.getItem('osmoha_cars')) || JSON.parse(localStorage.getItem('somdrive_cars')) || somDriveCars,
  bookings: JSON.parse(localStorage.getItem('osmoha_bookings')) || JSON.parse(localStorage.getItem('somdrive_bookings')) || initialBookings,
  currency: 'USD',
  rates: {
    USD: { rate: 1, symbol: '$', name: 'USD' },
    SOS: { rate: 26000, symbol: 'SOS ', name: 'Shilin Soomaali' }
  },
  currentCategory: 'all',
  searchQuery: '',
  maxPrice: 500,
  transmission: 'all',
  sortBy: 'default',
  activeView: 'portal', // 'portal' or 'dashboard'
  dashTab: 'overview', // 'overview', 'fleet', 'bookings'
  theme: localStorage.getItem('somdrive_theme') || 'dark',
  currentBookingCar: null
};

// Initialization on DOM Loaded
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  renderCars();
  initCategoryPills();
  initFilters();
  initBookingModalHandlers();
  initDashboardEvents();
  initCurrencySelector();
  updateDashboardAll();
});

// Format Currency Utility
function formatCurrency(amountUSD) {
  const cur = state.rates[state.currency];
  const converted = Math.round(amountUSD * cur.rate);
  return `${cur.symbol}${converted.toLocaleString()}`;
}

// Save to LocalStorage
function persistData() {
  localStorage.setItem('osmoha_cars', JSON.stringify(state.cars));
  localStorage.setItem('osmoha_bookings', JSON.stringify(state.bookings));
}

/* ===================================================================
   PUBLIC PORTAL: FLEET RENDERING & FILTERS
   =================================================================== */
function renderCars() {
  const container = document.getElementById('carsGrid');
  const countBadge = document.getElementById('fleetResultCount');
  if (!container) return;

  // Filter cars
  let filtered = state.cars.filter(car => {
    // Category
    const matchCategory = state.currentCategory === 'all' || car.category === state.currentCategory;
    // Search
    const q = state.searchQuery.toLowerCase().trim();
    const matchSearch = !q || 
      car.name.toLowerCase().includes(q) ||
      car.categoryName.toLowerCase().includes(q) ||
      car.location.toLowerCase().includes(q) ||
      car.fuel.toLowerCase().includes(q);
    // Price
    const matchPrice = car.dailyRateUSD <= state.maxPrice;
    // Transmission
    const matchTrans = state.transmission === 'all' || car.transmission.toLowerCase().includes(state.transmission.toLowerCase());

    return matchCategory && matchSearch && matchPrice && matchTrans;
  });

  // Sort cars
  if (state.sortBy === 'price-low') {
    filtered.sort((a, b) => a.dailyRateUSD - b.dailyRateUSD);
  } else if (state.sortBy === 'price-high') {
    filtered.sort((a, b) => b.dailyRateUSD - a.dailyRateUSD);
  } else if (state.sortBy === 'rating') {
    filtered.sort((a, b) => b.rating - a.rating);
  } else if (state.sortBy === 'year') {
    filtered.sort((a, b) => b.year - a.year);
  }

  if (countBadge) {
    countBadge.textContent = `Waxaa diyaar ah ${filtered.length} baabuur`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
        <i class="fas fa-car" style="font-size: 3rem; color: var(--primary); margin-bottom: 1rem;"></i>
        <h3>Ma jiro baabuur waafaqsan xogta aad raadisay</h3>
        <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Fadlan dib u deji shaandheynta ama ballaari miisaaniyadaada.</p>
        <button class="btn-primary" onclick="resetFilters()">
          <i class="fas fa-redo"></i> Dib u bilow Shaandheynta
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(car => {
    // Status Badge
    let statusBadge = '<span class="badge badge-success"><i class="fas fa-check-circle"></i> Diyaar</span>';
    if (car.status === 'rented') {
      statusBadge = '<span class="badge badge-warning"><i class="fas fa-clock"></i> Kireysan</span>';
    } else if (car.status === 'maintenance') {
      statusBadge = '<span class="badge badge-danger"><i class="fas fa-wrench"></i> Dayactir</span>';
    }

    return `
      <article class="car-card" data-id="${car.id}">
        <div class="car-media">
          <img src="${car.image}" alt="${car.name}" class="car-img" loading="lazy">
          <div class="car-badge-top">
            <span class="badge badge-primary">${car.badge || car.categoryName}</span>
          </div>
          <div class="car-status-tag">
            ${statusBadge}
          </div>
        </div>

        <div class="car-body">
          <div class="car-cat-sub">${car.categoryName} • ${car.year}</div>
          <h3 class="car-title">${car.name}</h3>
          <p class="car-desc">${car.description}</p>

          <div class="car-specs-row">
            <div class="spec-item">
              <span>Kuraasta</span>
              <strong><i class="fas fa-users"></i> ${car.seats} Qof</strong>
            </div>
            <div class="spec-item">
              <span>Gear-ka</span>
              <strong><i class="fas fa-cog"></i> ${car.transmission.split(' ')[0]}</strong>
            </div>
            <div class="spec-item">
              <span>Shidaalka</span>
              <strong><i class="fas fa-gas-pump"></i> ${car.fuel.split(' ')[0]}</strong>
            </div>
          </div>

          <div class="car-footer">
            <div class="price-box">
              <span class="period">Qiimaha / Maalintii</span>
              <span class="rate">${formatCurrency(car.dailyRateUSD)}</span>
            </div>

            <div class="car-actions">
              <button class="btn-secondary" style="padding: 0.6rem 0.9rem; font-size: 0.82rem;" onclick="openCarDetail('${car.id}')" title="Faahfaahin">
                <i class="fas fa-info-circle"></i> Eeg
              </button>
              <button class="btn-primary" style="padding: 0.6rem 1.1rem; font-size: 0.85rem;" onclick="openBookingModal('${car.id}')" ${car.status !== 'available' ? 'disabled style="opacity:0.6; cursor:not-allowed;"' : ''}>
                <i class="fas fa-key"></i> Kireyso
              </button>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// Category Pills Filtering
function initCategoryPills() {
  const pills = document.querySelectorAll('.pill-btn');
  const catCards = document.querySelectorAll('.cat-card');

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.currentCategory = pill.getAttribute('data-cat');
      renderCars();
    });
  });

  catCards.forEach(card => {
    card.addEventListener('click', () => {
      const cat = card.getAttribute('data-cat');
      state.currentCategory = cat;

      pills.forEach(p => {
        if (p.getAttribute('data-cat') === cat) p.classList.add('active');
        else p.classList.remove('active');
      });

      renderCars();
      document.getElementById('fleetSection').scrollIntoView({ behavior: 'smooth' });
    });
  });
}

// Filters & Live Search
function initFilters() {
  const searchInput = document.getElementById('carSearchInput');
  const sortSelect = document.getElementById('carSortSelect');
  const priceSlider = document.getElementById('priceRangeSlider');
  const priceDisplay = document.getElementById('priceRangeVal');
  const transSelect = document.getElementById('carTransSelect');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderCars();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      renderCars();
    });
  }

  if (priceSlider && priceDisplay) {
    priceSlider.addEventListener('input', (e) => {
      state.maxPrice = parseInt(e.target.value);
      priceDisplay.textContent = formatCurrency(state.maxPrice);
      renderCars();
    });
  }

  if (transSelect) {
    transSelect.addEventListener('change', (e) => {
      state.transmission = e.target.value;
      renderCars();
    });
  }

  // Hero Quick Search Button
  const heroSearchBtn = document.getElementById('heroSearchBtn');
  if (heroSearchBtn) {
    heroSearchBtn.addEventListener('click', () => {
      const city = document.getElementById('heroCity').value;
      const cat = document.getElementById('heroCat').value;
      
      state.currentCategory = cat;
      const pills = document.querySelectorAll('.pill-btn');
      pills.forEach(p => {
        if (p.getAttribute('data-cat') === cat) p.classList.add('active');
        else p.classList.remove('active');
      });

      renderCars();
      document.getElementById('fleetSection').scrollIntoView({ behavior: 'smooth' });
      showToast(`Baaritaankii magaalada ${city} waa la fuliyay!`, 'info');
    });
  }
}

function resetFilters() {
  state.currentCategory = 'all';
  state.searchQuery = '';
  state.maxPrice = 500;
  state.transmission = 'all';
  state.sortBy = 'default';

  const searchInput = document.getElementById('carSearchInput');
  const sortSelect = document.getElementById('carSortSelect');
  const priceSlider = document.getElementById('priceRangeSlider');
  const priceDisplay = document.getElementById('priceRangeVal');
  const transSelect = document.getElementById('carTransSelect');

  if (searchInput) searchInput.value = '';
  if (sortSelect) sortSelect.value = 'default';
  if (priceSlider) priceSlider.value = 500;
  if (priceDisplay) priceDisplay.textContent = formatCurrency(500);
  if (transSelect) transSelect.value = 'all';

  document.querySelectorAll('.pill-btn').forEach(p => {
    if (p.getAttribute('data-cat') === 'all') p.classList.add('active');
    else p.classList.remove('active');
  });

  renderCars();
  showToast('Shaandheynta waa la cusbooneysiiyay', 'info');
}

/* ===================================================================
   BOOKING MODAL WORKFLOW & LIVE PRICE CALCULATOR
   =================================================================== */
function openBookingModal(carId) {
  const car = state.cars.find(c => c.id === carId);
  if (!car) return;

  state.currentBookingCar = car;

  const modal = document.getElementById('bookingModal');
  const previewImg = document.getElementById('bookCarImg');
  const previewTitle = document.getElementById('bookCarTitle');
  const previewRate = document.getElementById('bookCarDailyRate');
  const previewPlate = document.getElementById('bookCarPlate');
  const previewLocation = document.getElementById('bookCarLocation');

  previewImg.src = car.image;
  previewTitle.textContent = car.name;
  previewRate.textContent = `${formatCurrency(car.dailyRateUSD)} / Maalintii`;
  previewPlate.textContent = `Tiro: ${car.plateNumber}`;
  previewLocation.textContent = car.location;

  // Set default dates: Today to +3 days
  const today = new Date().toISOString().split('T')[0];
  const returnDefault = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const pickupInput = document.getElementById('bookPickupDate');
  const returnInput = document.getElementById('bookReturnDate');

  pickupInput.min = today;
  pickupInput.value = today;
  returnInput.min = today;
  returnInput.value = returnDefault;

  updateBookingCalc();
  modal.classList.add('open');
}

function closeBookingModal() {
  const modal = document.getElementById('bookingModal');
  if (modal) modal.classList.remove('open');
}

function updateBookingCalc() {
  if (!state.currentBookingCar) return;

  const car = state.currentBookingCar;
  const pickupDate = new Date(document.getElementById('bookPickupDate').value);
  const returnDate = new Date(document.getElementById('bookReturnDate').value);

  let days = Math.ceil((returnDate - pickupDate) / (1000 * 60 * 60 * 24));
  if (days < 1 || isNaN(days)) days = 1;

  // Add-ons
  const withDriver = document.getElementById('addonDriver').checked;
  const withInsurance = document.getElementById('addonInsurance').checked;
  const withGPS = document.getElementById('addonGPS').checked;

  const driverRate = withDriver ? 20 : 0;
  const insuranceRate = withInsurance ? 15 : 0;
  const gpsRate = withGPS ? 5 : 0;

  const baseTotal = car.dailyRateUSD * days;
  const driverTotal = driverRate * days;
  const insuranceTotal = insuranceRate * days;
  const gpsTotal = gpsRate * days;
  const grandTotal = baseTotal + driverTotal + insuranceTotal + gpsTotal;

  document.getElementById('calcDaysCount').textContent = `${days} Maalmood`;
  document.getElementById('calcBasePrice').textContent = formatCurrency(baseTotal);
  document.getElementById('calcDriverFee').textContent = formatCurrency(driverTotal);
  document.getElementById('calcInsuranceFee').textContent = formatCurrency(insuranceTotal);
  document.getElementById('calcGrandTotal').textContent = formatCurrency(grandTotal);
}

function initBookingModalHandlers() {
  const pickupInput = document.getElementById('bookPickupDate');
  const returnInput = document.getElementById('bookReturnDate');
  const addonDriver = document.getElementById('addonDriver');
  const addonInsurance = document.getElementById('addonInsurance');
  const addonGPS = document.getElementById('addonGPS');

  [pickupInput, returnInput, addonDriver, addonInsurance, addonGPS].forEach(elem => {
    if (elem) elem.addEventListener('change', updateBookingCalc);
  });

  const form = document.getElementById('rentalBookingForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleBookingSubmit();
    });
  }
}

function handleBookingSubmit() {
  const car = state.currentBookingCar;
  if (!car) return;

  const name = document.getElementById('custName').value;
  const phone = document.getElementById('custPhone').value;
  const city = document.getElementById('custCity').value;
  const dropLocation = document.getElementById('custDropLocation').value;
  const pickupDate = document.getElementById('bookPickupDate').value;
  const returnDate = document.getElementById('bookReturnDate').value;

  const pickupD = new Date(pickupDate);
  const returnD = new Date(returnDate);
  let days = Math.ceil((returnD - pickupD) / (1000 * 60 * 60 * 24));
  if (days < 1) days = 1;

  const withDriver = document.getElementById('addonDriver').checked;
  const withInsurance = document.getElementById('addonInsurance').checked;
  const withGPS = document.getElementById('addonGPS').checked;

  const extras = [];
  if (withDriver) extras.push("Darawal Khibrad Leh");
  if (withInsurance) extras.push("Caymis Buuxa VIP");
  if (withGPS) extras.push("GPS Navigation");

  const driverRate = withDriver ? 20 : 0;
  const insuranceRate = withInsurance ? 15 : 0;
  const gpsRate = withGPS ? 5 : 0;
  const grandTotalUSD = (car.dailyRateUSD + driverRate + insuranceRate + gpsRate) * days;

  // New Booking Object
  const newBookingId = `BK-${Math.floor(1000 + Math.random() * 9000)}`;
  const newBooking = {
    id: newBookingId,
    customerName: name,
    customerPhone: phone,
    customerEmail: `${name.toLowerCase().replace(/\s+/g, '.')}@client.so`,
    carId: car.id,
    carName: car.name,
    pickupCity: city,
    dropLocation: dropLocation,
    pickupDate: pickupDate,
    returnDate: returnDate,
    totalDays: days,
    dailyRateUSD: car.dailyRateUSD,
    withDriver: withDriver,
    driverFeeUSD: driverRate * days,
    extras: extras,
    totalPriceUSD: grandTotalUSD,
    status: "confirmed", // set confirmed
    bookingDate: new Date().toISOString().split('T')[0]
  };

  // Add booking to state and mark car as rented
  state.bookings.unshift(newBooking);
  car.status = 'rented';

  persistData();
  closeBookingModal();
  renderCars();
  updateDashboardAll();

  // Show Success Receipt Modal or Toast
  showToast(`Hambalyo ${name}! Kiradaada ${car.name} (${newBookingId}) ee magaalada ${city} waa la xaqiijiyay!`, 'success');
  openBookingTicketModal(newBooking);
}

// Booking Ticket Confirmation
function openBookingTicketModal(b) {
  const ticketModal = document.getElementById('ticketModal');
  const ticketBody = document.getElementById('ticketModalBody');
  if (!ticketModal || !ticketBody) return;

  ticketBody.innerHTML = `
    <div style="text-align: center; margin-bottom: 1.5rem;">
      <div style="width: 60px; height: 60px; background: rgba(16, 185, 129, 0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.8rem; color: var(--emerald); font-size: 2rem;">
        <i class="fas fa-check-circle"></i>
      </div>
      <h3 style="font-size: 1.6rem; font-weight: 900;">Kiradaada Waa La Xaqiijiyay!</h3>
      <p style="color: var(--text-muted);">Tigidhka Kirada Osmoha Company: <strong style="color:var(--primary);">${b.id}</strong></p>
    </div>

    <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.5rem; margin-bottom: 1.5rem;">
      <div style="display:flex; justify-content:space-between; margin-bottom:0.75rem;">
        <span style="color:var(--text-muted);">Baabuurka:</span>
        <strong>${b.carName}</strong>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:0.75rem;">
        <span style="color:var(--text-muted);">Macaamiilka:</span>
        <strong>${b.customerName} (${b.customerPhone})</strong>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:0.75rem;">
        <span style="color:var(--text-muted);">Magaalada & Goobta:</span>
        <strong>${b.pickupCity} (${b.dropLocation || 'Xarunta Osmoha Company'})</strong>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:0.75rem;">
        <span style="color:var(--text-muted);">Muddada:</span>
        <strong>${b.pickupDate} ilaa ${b.returnDate} (${b.totalDays} Maalmood)</strong>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:0.75rem;">
        <span style="color:var(--text-muted);">Dookha Darawalka:</span>
        <strong>${b.withDriver ? 'Darawal Leh (+ $20/maalintii)' : 'Bilaa Darawal (Self Drive)'}</strong>
      </div>
      <div style="display:flex; justify-content:space-between; border-top:1px solid var(--border-color); padding-top:0.75rem; margin-top:0.75rem; font-size:1.25rem;">
        <span>Wadarta Qiimaha:</span>
        <strong style="color:var(--primary-light);">${formatCurrency(b.totalPriceUSD)}</strong>
      </div>
    </div>

    <div style="display:flex; gap:1rem;">
      <button class="btn-primary" style="flex:1; justify-content:center;" onclick="window.print();">
        <i class="fas fa-print"></i> Daabac Tigidhka
      </button>
      <button class="btn-secondary" style="flex:1; justify-content:center;" onclick="closeTicketModal();">
        <i class="fas fa-check"></i> Waa Fahmay
      </button>
    </div>
  `;

  ticketModal.classList.add('open');
}

function closeTicketModal() {
  document.getElementById('ticketModal').classList.remove('open');
}

// Car Detail Modal (Public View)
function openCarDetail(carId) {
  const car = state.cars.find(c => c.id === carId);
  if (!car) return;

  const modal = document.getElementById('detailModal');
  const body = document.getElementById('detailModalBody');
  if (!modal || !body) return;

  body.innerHTML = `
    <div style="position:relative; height: 320px; overflow:hidden;">
      <img src="${car.image}" style="width:100%; height:100%; object-fit:cover;" alt="${car.name}">
      <div style="position:absolute; bottom:1rem; left:1.5rem; background:rgba(0,0,0,0.7); backdrop-filter:blur(8px); padding:0.4rem 1rem; border-radius:var(--radius-full); font-size:0.85rem; font-weight:700;">
        <i class="fas fa-map-marker-alt" style="color:var(--primary);"></i> ${car.location}
      </div>
    </div>

    <div style="padding: 2rem;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem; flex-wrap:wrap; gap:1rem;">
        <div>
          <span class="badge badge-primary">${car.categoryName} • ${car.year}</span>
          <h2 style="font-size:1.8rem; font-weight:900; margin-top:0.4rem;">${car.name}</h2>
          <span style="color:var(--text-muted); font-size:0.9rem;">Taargada: ${car.plateNumber}</span>
        </div>
        <div style="text-align:right;">
          <span style="font-size:0.8rem; color:var(--text-muted); display:block;">Qiimaha Maalintii</span>
          <span style="font-size:2rem; font-weight:900; color:var(--primary-light);">${formatCurrency(car.dailyRateUSD)}</span>
        </div>
      </div>

      <p style="color:var(--text-muted); line-height:1.7; margin-bottom:1.5rem;">${car.description}</p>

      <h4 style="font-size:1.1rem; font-weight:800; margin-bottom:0.8rem;">Qalabka & Astaamaha Doonista:</h4>
      <ul style="list-style:none; display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:0.6rem; margin-bottom:2rem;">
        ${car.features.map(f => `<li style="font-size:0.9rem;"><i class="fas fa-check-circle" style="color:var(--emerald); margin-right:0.4rem;"></i> ${f}</li>`).join('')}
      </ul>

      <div style="display:flex; gap:1rem;">
        <button class="btn-primary" style="flex:1; justify-content:center; padding:0.85rem;" onclick="closeDetailModal(); openBookingModal('${car.id}');" ${car.status !== 'available' ? 'disabled' : ''}>
          <i class="fas fa-key"></i> Kireyso Baabuurkan Hadda
        </button>
        <button class="btn-secondary" onclick="closeDetailModal();">
          Xir
        </button>
      </div>
    </div>
  `;

  modal.classList.add('open');
}

function closeDetailModal() {
  document.getElementById('detailModal').classList.remove('open');
}

/* ===================================================================
   ADMIN / FLEET DASHBOARD ENGINE
   =================================================================== */
function initDashboardEvents() {
  // Toggle between Public Portal and Admin Dashboard
  const dashBtn = document.getElementById('openDashboardBtn');
  const backToPortalBtn = document.getElementById('backToPortalBtn');

  if (dashBtn) {
    dashBtn.addEventListener('click', () => switchView('dashboard'));
  }
  if (backToPortalBtn) {
    backToPortalBtn.addEventListener('click', () => switchView('portal'));
  }

  // Dashboard Sidebar Navigation Buttons
  const navBtns = document.querySelectorAll('.sidebar-btn');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.getAttribute('data-tab');
      switchDashTab(tab);
    });
  });

  // Add Car Form
  const addCarForm = document.getElementById('addCarForm');
  if (addCarForm) {
    addCarForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleAddNewCar();
    });
  }
}

function switchView(viewName) {
  state.activeView = viewName;
  const portal = document.getElementById('portalView');
  const dashboard = document.getElementById('dashboardView');

  if (viewName === 'dashboard') {
    portal.style.display = 'none';
    dashboard.classList.add('active');
    updateDashboardAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Kusoo dhawaaw Dashboard-ka Maamulka Osmoha Company!', 'info');
  } else {
    dashboard.classList.remove('active');
    portal.style.display = 'block';
    renderCars();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function switchDashTab(tabName) {
  state.dashTab = tabName;
  const tabs = document.querySelectorAll('.dash-tab-content');
  tabs.forEach(tab => {
    if (tab.id === `tab-${tabName}`) {
      tab.style.display = 'block';
    } else {
      tab.style.display = 'none';
    }
  });

  if (tabName === 'fleet') renderFleetTable();
  if (tabName === 'bookings') renderBookingsTable();
}

function updateDashboardAll() {
  renderDashboardKPIs();
  renderFleetTable();
  renderBookingsTable();
  renderRecentBookingsMini();
}

// Render Dashboard Metric Cards
function renderDashboardKPIs() {
  const totalFleet = state.cars.length;
  const activeRentals = state.bookings.filter(b => b.status === 'active' || b.status === 'confirmed').length;
  const availableCars = state.cars.filter(c => c.status === 'available').length;
  const totalRevenue = state.bookings.reduce((sum, b) => b.status !== 'cancelled' ? sum + b.totalPriceUSD : sum, 0);

  document.getElementById('dashTotalFleet').textContent = totalFleet;
  document.getElementById('dashActiveRentals').textContent = activeRentals;
  document.getElementById('dashAvailableCars').textContent = availableCars;
  document.getElementById('dashTotalRevenue').textContent = formatCurrency(totalRevenue);
}

// Render Fleet Table in Dashboard
function renderFleetTable() {
  const tbody = document.getElementById('fleetTableBody');
  if (!tbody) return;

  tbody.innerHTML = state.cars.map(car => {
    let statusClass = 'badge-success';
    let statusText = 'Diyaar (Available)';
    if (car.status === 'rented') {
      statusClass = 'badge-warning';
      statusText = 'Kireysan (Rented)';
    } else if (car.status === 'maintenance') {
      statusClass = 'badge-danger';
      statusText = 'Dayactir (Maintenance)';
    }

    return `
      <tr>
        <td>
          <div class="table-car-cell">
            <img src="${car.image}" class="table-thumb" alt="${car.name}">
            <div>
              <strong>${car.name}</strong>
              <div style="font-size:0.75rem; color:var(--text-muted);">${car.plateNumber}</div>
            </div>
          </div>
        </td>
        <td>${car.categoryName}</td>
        <td><strong>${formatCurrency(car.dailyRateUSD)}</strong> / maalin</td>
        <td>${car.location.split(' ')[0]}</td>
        <td>
          <span class="badge ${statusClass}">${statusText}</span>
        </td>
        <td>
          <div style="display:flex; gap:0.4rem;">
            <button class="btn-action-sm btn-secondary" onclick="toggleCarStatus('${car.id}')" title="Bedel Xaaladda">
              <i class="fas fa-sync-alt"></i> Xaalad
            </button>
            <button class="btn-action-sm btn-secondary" style="color:var(--danger);" onclick="deleteCar('${car.id}')" title="Tir">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Render Bookings Table in Dashboard
function renderBookingsTable() {
  const tbody = document.getElementById('bookingsTableBody');
  if (!tbody) return;

  tbody.innerHTML = state.bookings.map(b => {
    let statusBadge = '';
    if (b.status === 'confirmed') statusBadge = '<span class="badge badge-info"><i class="fas fa-check"></i> Xaqiijisan</span>';
    else if (b.status === 'active') statusBadge = '<span class="badge badge-success"><i class="fas fa-car-side"></i> Kireysan (Active)</span>';
    else if (b.status === 'pending') statusBadge = '<span class="badge badge-warning"><i class="fas fa-hourglass-half"></i> Sugaya</span>';
    else if (b.status === 'completed') statusBadge = '<span class="badge" style="background:rgba(255,255,255,0.1); color:#fff;"><i class="fas fa-flag-checkered"></i> Soo Celiyay</span>';
    else if (b.status === 'cancelled') statusBadge = '<span class="badge badge-danger"><i class="fas fa-times"></i> Joojiyay</span>';

    return `
      <tr>
        <td><strong>${b.id}</strong></td>
        <td>
          <strong>${b.customerName}</strong>
          <div style="font-size:0.78rem; color:var(--text-muted);">${b.customerPhone}</div>
        </td>
        <td>${b.carName}</td>
        <td>${b.pickupCity}</td>
        <td>${b.pickupDate} ilaa ${b.returnDate} (${b.totalDays}m)</td>
        <td><strong style="color:var(--primary-light);">${formatCurrency(b.totalPriceUSD)}</strong></td>
        <td>${statusBadge}</td>
        <td>
          <div style="display:flex; gap:0.3rem;">
            ${b.status !== 'active' && b.status !== 'completed' ? `
              <button class="btn-action-sm btn-primary" onclick="setBookingStatus('${b.id}', 'active')" title="Bilow Kirada">
                <i class="fas fa-play"></i> Bilow
              </button>
            ` : ''}
            ${b.status === 'active' ? `
              <button class="btn-action-sm btn-secondary" style="color:var(--emerald);" onclick="setBookingStatus('${b.id}', 'completed')" title="Soo Celiyay">
                <i class="fas fa-check"></i> Soo Celi
              </button>
            ` : ''}
            ${b.status !== 'cancelled' && b.status !== 'completed' ? `
              <button class="btn-action-sm btn-secondary" style="color:var(--danger);" onclick="setBookingStatus('${b.id}', 'cancelled')" title="Jooji">
                <i class="fas fa-times"></i>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Render Mini Table for Overview Tab
function renderRecentBookingsMini() {
  const container = document.getElementById('recentBookingsMini');
  if (!container) return;

  const recents = state.bookings.slice(0, 5);
  container.innerHTML = recents.map(b => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:0.8rem; background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:var(--radius-sm); margin-bottom:0.6rem;">
      <div>
        <strong style="font-size:0.92rem;">${b.customerName}</strong>
        <div style="font-size:0.78rem; color:var(--text-muted);">${b.carName} • ${b.pickupCity}</div>
      </div>
      <div style="text-align:right;">
        <span style="font-weight:800; color:var(--primary-light); font-size:0.95rem;">${formatCurrency(b.totalPriceUSD)}</span>
        <div style="font-size:0.75rem; text-transform:uppercase; color:var(--emerald); font-weight:700;">${b.status}</div>
      </div>
    </div>
  `).join('');
}

// Update Booking Status Action
function setBookingStatus(bookingId, newStatus) {
  const booking = state.bookings.find(b => b.id === bookingId);
  if (!booking) return;

  booking.status = newStatus;

  // Sync Car availability
  const car = state.cars.find(c => c.id === booking.carId);
  if (car) {
    if (newStatus === 'completed' || newStatus === 'cancelled') {
      car.status = 'available';
    } else if (newStatus === 'active') {
      car.status = 'rented';
    }
  }

  persistData();
  updateDashboardAll();
  renderCars();
  showToast(`Kirada ${bookingId} xaaladdeeda waxaa loo beddelay '${newStatus}'!`, 'success');
}

// Toggle Car Availability
function toggleCarStatus(carId) {
  const car = state.cars.find(c => c.id === carId);
  if (!car) return;

  if (car.status === 'available') car.status = 'rented';
  else if (car.status === 'rented') car.status = 'maintenance';
  else car.status = 'available';

  persistData();
  updateDashboardAll();
  renderCars();
  showToast(`Xaaladda ${car.name} waxaa loo beddelay '${car.status}'`, 'info');
}

// Delete Car from Fleet
function deleteCar(carId) {
  if (!confirm('Ma hubtaa inaad baabuurkan ka saarayso liiska diiwaanka?')) return;
  state.cars = state.cars.filter(c => c.id !== carId);
  persistData();
  updateDashboardAll();
  renderCars();
  showToast('Baabuurka waa laga saaray diiwaanka!', 'warning');
}

// Add New Car Modal & Handler
function openAddCarModal() {
  document.getElementById('addCarModal').classList.add('open');
}

function closeAddCarModal() {
  document.getElementById('addCarModal').classList.remove('open');
}

function handleAddNewCar() {
  const name = document.getElementById('newCarName').value;
  const category = document.getElementById('newCarCat').value;
  const year = parseInt(document.getElementById('newCarYear').value);
  const plate = document.getElementById('newCarPlate').value;
  const price = parseFloat(document.getElementById('newCarPrice').value);
  const seats = parseInt(document.getElementById('newCarSeats').value);
  const transmission = document.getElementById('newCarTrans').value;
  const fuel = document.getElementById('newCarFuel').value;
  const city = document.getElementById('newCarCity').value;
  let image = document.getElementById('newCarImage').value;

  if (!image) {
    // Default high-quality car image if left empty
    image = "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80";
  }

  const newCar = {
    id: `car-${Date.now()}`,
    name: name,
    category: category,
    categoryName: category.toUpperCase(),
    year: year,
    plateNumber: plate,
    dailyRateUSD: price,
    seats: seats,
    transmission: transmission,
    fuel: fuel,
    ac: true,
    luggage: "3 Boorso",
    driverOption: "Darawal Leh ama Bilaa Darawal",
    location: city,
    status: "available",
    featured: false,
    badge: "Cusub",
    rating: 5.0,
    rentalsCount: 0,
    image: image,
    description: `${name} (${year}) - Baabuur cusub oo lagu daray fleet-ka Osmoha Company ee magaalada ${city}.`,
    features: [
      "Xaalad cusub oo heer sare ah",
      "Qaboojiye awood leh",
      "Kuraas raaxo leh",
      "Shidaal badbaadin"
    ]
  };

  state.cars.unshift(newCar);
  persistData();
  closeAddCarModal();
  document.getElementById('addCarForm').reset();
  updateDashboardAll();
  renderCars();
  showToast(`Baabuurka '${name}' si guul leh ayaa loogu daray fleet-ka!`, 'success');
}

// Currency Selector
function initCurrencySelector() {
  const selector = document.getElementById('currencySelector');
  if (selector) {
    selector.addEventListener('change', (e) => {
      state.currency = e.target.value;
      renderCars();
      updateDashboardAll();
      showToast(`Lacagta waxaa loo bedelay ${state.currency}`, 'info');
    });
  }
}

// Theme Toggle
function initTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  const btn = document.getElementById('themeToggleBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', state.theme);
      localStorage.setItem('somdrive_theme', state.theme);
      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = state.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
      }
    });
  }
}

// Toast Notifications Utility
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let icon = 'fas fa-info-circle';
  if (type === 'success') icon = 'fas fa-check-circle';
  if (type === 'warning') icon = 'fas fa-exclamation-triangle';

  toast.innerHTML = `<i class="${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 40);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
