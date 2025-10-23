from __future__ import annotations

import os
from typing import Any

import pandas as pd
from flask import Flask, jsonify, render_template, request


app = Flask(__name__)


@app.route("/")
def index() -> str:
    return render_template("index.html")


@app.route("/api/upload", methods=["POST"])
def upload() -> tuple[Any, int]:
    if "file" not in request.files:
        return jsonify({"error": "未找到上传的文件"}), 400

    uploaded_file = request.files["file"]

    if not uploaded_file or uploaded_file.filename == "":
        return jsonify({"error": "请选择要上传的 Excel 文件"}), 400

    try:
        dataframe = pd.read_excel(uploaded_file)
    except ValueError:
        return jsonify({"error": "暂不支持该类型的 Excel 文件，请使用 .xlsx 格式"}), 400
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": f"解析 Excel 失败: {exc}"}), 400

    if dataframe.empty:
        return jsonify({"error": "Excel 文件为空"}), 400

    # Identify column types before converting values to strings
    numeric_columns = [
        column for column in dataframe.columns if pd.api.types.is_numeric_dtype(dataframe[column])
    ]
    non_numeric_columns = [column for column in dataframe.columns if column not in numeric_columns]

    sanitized_dataframe = dataframe.fillna("")
    records = sanitized_dataframe.to_dict(orient="records")

    chart_preview: dict[str, Any] | None = None
    numeric_data: dict[str, list[float]] = {}

    if numeric_columns:
        for column in numeric_columns:
            numeric_series = pd.to_numeric(dataframe[column], errors="coerce").fillna(0.0)
            numeric_data[column] = numeric_series.astype(float).tolist()

        default_y = numeric_columns[0]

        if non_numeric_columns:
            default_x = non_numeric_columns[0]
            labels = sanitized_dataframe[default_x].astype(str).tolist()
            x_axis_label = default_x
        else:
            labels = [str(index + 1) for index in range(len(sanitized_dataframe))]
            x_axis_label = "行号"

        chart_preview = {
            "x": x_axis_label,
            "y": default_y,
            "labels": labels,
            "values": numeric_data[default_y],
        }

    return (
        jsonify(
            {
                "columns": sanitized_dataframe.columns.tolist(),
                "rows": records,
                "numericColumns": numeric_columns,
                "nonNumericColumns": non_numeric_columns,
                "numericData": numeric_data,
                "chart": chart_preview,
            }
        ),
        200,
    )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
