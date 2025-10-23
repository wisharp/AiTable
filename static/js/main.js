const uploadForm = document.getElementById("upload-form");
const fileInput = document.getElementById("excel-file");
const statusLabel = document.getElementById("status");
const errorBox = document.getElementById("error-box");
const datasetSection = document.getElementById("dataset");
const tableWrapper = document.getElementById("table-wrapper");
const chartConfigSection = document.getElementById("chart-config");
const xSelect = document.getElementById("x-select");
const ySelect = document.getElementById("y-select");
const chartCanvas = document.getElementById("data-chart");
const chartMessage = document.getElementById("chart-message");

const ROW_INDEX_KEY = "__row_index__";

const state = {
  columns: [],
  rows: [],
  numericColumns: [],
  nonNumericColumns: [],
  numericData: {},
  chart: null,
};

let chartInstance = null;

const toggleHidden = (element, hidden) => {
  element.classList.toggle("hidden", hidden);
};

const setStatus = (message) => {
  statusLabel.textContent = message ?? "";
};

const showError = (message) => {
  if (!message) {
    toggleHidden(errorBox, true);
    errorBox.textContent = "";
    return;
  }

  errorBox.textContent = message;
  toggleHidden(errorBox, false);
};

const renderTable = (columns, rows) => {
  if (!columns.length) {
    tableWrapper.innerHTML = "<p>未检测到可展示的数据。</p>";
    return;
  }

  const maxRows = 20;
  const visibleRows = rows.slice(0, maxRows);

  const thead = `
    <thead>
      <tr>
        ${columns.map((column) => `<th>${column}</th>`).join("")}
      </tr>
    </thead>
  `;

  const tbody = `
    <tbody>
      ${visibleRows
        .map(
          (row) => `
            <tr>
              ${columns.map((column) => `<td>${row[column] ?? ""}</td>`).join("")}
            </tr>
          `,
        )
        .join("")}
    </tbody>
  `;

  const caption =
    rows.length > maxRows
      ? `<caption>仅展示前 ${maxRows} 行，共 ${rows.length} 行。</caption>`
      : "";

  tableWrapper.innerHTML = `
    <table>
      ${caption}
      ${thead}
      ${tbody}
    </table>
  `;
};

const optionFromValue = (value, label, selectedValue) => {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  if (selectedValue != null && selectedValue === value) {
    option.selected = true;
  }
  return option;
};

const populateSelects = () => {
  xSelect.innerHTML = "";
  ySelect.innerHTML = "";

  const xSelectedValue =
    state.chart?.x === "行号"
      ? ROW_INDEX_KEY
      : state.chart?.x ?? state.nonNumericColumns[0] ?? ROW_INDEX_KEY;
  const ySelectedValue = state.chart?.y ?? state.numericColumns[0];

  xSelect.appendChild(optionFromValue(ROW_INDEX_KEY, "行号", xSelectedValue));
  state.nonNumericColumns.forEach((column) => {
    xSelect.appendChild(optionFromValue(column, column, xSelectedValue));
  });

  if (!state.numericColumns.length) {
    xSelect.disabled = true;
    ySelect.disabled = true;
    xSelect.value = xSelectedValue;
    toggleHidden(chartConfigSection, false);
    chartCanvas.classList.add("hidden");
    toggleHidden(chartMessage, false);
    chartMessage.textContent = "Excel 文件中未检测到数值列，无法生成图表。";
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    return;
  }

  state.numericColumns.forEach((column) => {
    ySelect.appendChild(optionFromValue(column, column, ySelectedValue));
  });

  xSelect.disabled = false;
  ySelect.disabled = false;

  xSelect.value = xSelectedValue;
  if (ySelectedValue) {
    ySelect.value = ySelectedValue;
  }

  toggleHidden(chartConfigSection, false);
  chartCanvas.classList.remove("hidden");
  toggleHidden(chartMessage, true);
  chartMessage.textContent = "";

  createOrUpdateChart();
};

const buildChartData = (xKey, yKey) => {
  const labels = state.rows.map((row, index) => {
    if (xKey === ROW_INDEX_KEY) {
      return `行 ${index + 1}`;
    }
    const value = row[xKey];
    return value === undefined || value === null || value === "" ? "(空)" : String(value);
  });

  const rawValues = state.numericData[yKey] ?? [];
  const values = labels.map((_, index) => rawValues[index] ?? 0);

  return { labels, values };
};

const createOrUpdateChart = () => {
  const xKey = xSelect.value || ROW_INDEX_KEY;
  const yKey = ySelect.value;

  if (!yKey) {
    return;
  }

  const { labels, values } = buildChartData(xKey, yKey);

  if (!chartInstance) {
    chartInstance = new Chart(chartCanvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: yKey,
            data: values,
            backgroundColor: "rgba(37, 99, 235, 0.45)",
            borderColor: "rgba(37, 99, 235, 0.9)",
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { color: "#334155" },
            grid: { color: "rgba(148, 163, 184, 0.2)" },
          },
          y: {
            ticks: { color: "#334155" },
            grid: { color: "rgba(148, 163, 184, 0.2)" },
          },
        },
      },
    });
  } else {
    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].label = yKey;
    chartInstance.data.datasets[0].data = values;
    chartInstance.update();
  }
};

xSelect.addEventListener("change", () => {
  if (state.numericColumns.length) {
    createOrUpdateChart();
  }
});

ySelect.addEventListener("change", () => {
  if (state.numericColumns.length) {
    createOrUpdateChart();
  }
});

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showError(null);

  const file = fileInput.files && fileInput.files[0];
  if (!file) {
    showError("请先选择需要导入的 Excel 文件。");
    return;
  }

  setStatus("上传并分析中...");

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const payload = await response.json();

    if (!response.ok) {
      showError(payload.error || "解析 Excel 文件失败。");
      toggleHidden(datasetSection, true);
      toggleHidden(chartConfigSection, true);
      return;
    }

    Object.assign(state, payload);

    renderTable(payload.columns, payload.rows);
    toggleHidden(datasetSection, false);

    populateSelects();
  } catch (error) {
    console.error(error);
    showError("上传过程中出现问题，请稍后重试。");
    toggleHidden(datasetSection, true);
    toggleHidden(chartConfigSection, true);
  } finally {
    setStatus("");
  }
});
