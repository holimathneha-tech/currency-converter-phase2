const apiUrl = "https://api.frankfurter.app";

const amountEl = document.getElementById("amount");
const fromCurrency = document.getElementById("fromCurrency");
const toCurrency = document.getElementById("toCurrency");
const resultEl = document.getElementById("result");
const historyEl = document.getElementById("history");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const chartCanvas = document.getElementById("rateChart");

let chart;
let conversionHistory = JSON.parse(localStorage.getItem("history")) || [];

function showError(msg) {
  resultEl.textContent = "⚠️ " + msg;
}

// Populate currency dropdowns
async function loadCurrencies() {
  try {
    const res = await fetch(`${apiUrl}/currencies`);
    if (!res.ok) throw new Error("Failed to fetch currency list");
    const data = await res.json();

    fromCurrency.innerHTML = "";
    toCurrency.innerHTML = "";

    for (const code of Object.keys(data)) {
      const desc = data[code];
      const option1 = new Option(`${code} - ${desc}`, code);
      const option2 = new Option(`${code} - ${desc}`, code);
      fromCurrency.add(option1);
      toCurrency.add(option2);
    }

    fromCurrency.value = "USD";
    toCurrency.value = "INR";
  } catch (err) {
    console.error(err);
    showError("Could not load currency list. Check internet.");
  }
}

function displayHistory() {
  historyEl.innerHTML = "";
  conversionHistory.forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    historyEl.appendChild(li);
  });
  localStorage.setItem("history", JSON.stringify(conversionHistory));
}

clearHistoryBtn.addEventListener("click", () => {
  conversionHistory = [];
  displayHistory();
});

// Convert function + historical chart
async function convert() {
  const amt = amountEl.value;
  const from = fromCurrency.value;
  const to = toCurrency.value;

  if (!amt || isNaN(amt) || !from || !to) {
    alert("Please enter a valid amount and select both currencies.");
    return;
  }

  resultEl.textContent = "Converting...";

  try {
    // Convert
    const convRes = await fetch(`${apiUrl}/latest?amount=${amt}&from=${from}&to=${to}`);
    if (!convRes.ok) throw new Error("Conversion request failed");
    const convData = await convRes.json();

    if (convData && convData.rates && convData.rates[to] != null) {
      const value = convData.rates[to];
      resultEl.textContent = `${amt} ${from} = ${Number(value).toFixed(2)} ${to}`;

      // Add to history
      conversionHistory.unshift(`${amt} ${from} → ${Number(value).toFixed(2)} ${to}`);
      if (conversionHistory.length > 5) conversionHistory.pop();
      displayHistory();
    } else {
      throw new Error("Conversion result missing");
    }

    // Historical rates last 7 days
    const today = new Date();
    const endDate = today.toISOString().split("T")[0];
    const start = new Date();
    start.setDate(today.getDate() - 6);
    const startDate = start.toISOString().split("T")[0];

    const histRes = await fetch(`${apiUrl}/${startDate}..${endDate}?from=${from}&to=${to}`);
    if (!histRes.ok) throw new Error("Failed to fetch historical rates");
    const histData = await histRes.json();
    if (!histData || !histData.rates) throw new Error("Invalid historical data");

    const labels = Object.keys(histData.rates).sort();
    const rates = labels.map(d => histData.rates[d][to]);

    const ctx = chartCanvas.getContext("2d");
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: `${from} → ${to}`,
          data: rates,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37,99,235,0.2)",
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true } },
        scales: {
          x: { title: { display: true, text: "Date" } },
          y: { title: { display: true, text: "Rate" } }
        }
      }
    });

  } catch (err) {
    console.error(err);
    showError("API error. Check internet.");
  }
}

// Swap
document.getElementById("swapBtn").addEventListener("click", () => {
  const tmp = fromCurrency.value;
  fromCurrency.value = toCurrency.value;
  toCurrency.value = tmp;
});

// Refresh
document.getElementById("refreshBtn").addEventListener("click", () => {
  document.getElementById("convertBtn").click();
});

// Initialize
document.getElementById("convertBtn").addEventListener("click", convert);
loadCurrencies();
displayHistory();