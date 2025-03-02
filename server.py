from flask import Flask, jsonify, request, render_template, send_file
import pandas as pd
import os
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
import io

app = Flask(__name__)

SPREADSHEET_FILE = 'vehicle_log.ods'

# Initialize the ODS file with headers if it doesn't exist
def initialize_spreadsheet():
    if not os.path.exists(SPREADSHEET_FILE):
        headers = ['Date', 'Starting Km', 'End Km', 'Running Km', 'Purpose']
        df = pd.DataFrame(columns=headers)
        df.to_excel(SPREADSHEET_FILE, index=False, engine='odf')

# Load data from ODS file
def load_data():
    initialize_spreadsheet()
    df = pd.read_excel(SPREADSHEET_FILE, engine='odf')
    return df.to_dict(orient='records')

# Save data to ODS file
def save_data(data):
    df = pd.DataFrame(data)
    df.to_excel(SPREADSHEET_FILE, index=False, engine='odf')

# Calculate monthly running kilometers
def calculate_monthly_totals(data):
    monthly_totals = {}
    for entry in data:
        date = datetime.strptime(entry['Date'], '%Y-%m-%d')
        month_key = date.strftime('%Y-%m')  # e.g., "2025-02"
        running_km = entry['Running Km']
        monthly_totals[month_key] = monthly_totals.get(month_key, 0) + running_km
    return monthly_totals

# Generate PDF report
def generate_pdf_report(monthly_totals):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []

    styles = getSampleStyleSheet()
    title = Paragraph("Monthly Running Kilometers Report", styles['Title'])
    elements.append(title)
    elements.append(Paragraph("<br/><br/>", styles['Normal']))  # Spacer

    # Table data
    data = [['Month', 'Total Running Km']] + [[month, total] for month, total in monthly_totals.items()]
    table = Table(data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 14),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    elements.append(table)

    doc.build(elements)
    buffer.seek(0)
    return buffer

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/logs', methods=['GET'])
def get_logs():
    data = load_data()
    monthly_totals = calculate_monthly_totals(data)
    response = {
        'logs': data,
        'monthly_totals': monthly_totals
    }
    return jsonify(response)

@app.route('/api/logs', methods=['POST'])
def add_log():
    entry = request.json
    data = load_data()
    data.append(entry)
    save_data(data)
    return '', 200

@app.route('/api/logs/<int:index>', methods=['PUT'])
def edit_log(index):
    data = load_data()
    if 0 <= index < len(data):
        updated_entry = request.json
        data[index]['Date'] = data[index]['Date']
        data[index]['Starting Km'] = updated_entry.get('Starting Km', data[index]['Starting Km'])
        data[index]['End Km'] = updated_entry.get('End Km', data[index]['End Km'])
        data[index]['Running Km'] = updated_entry.get('Running Km', data[index]['Running Km'])
        data[index]['Purpose'] = updated_entry.get('Purpose', data[index]['Purpose'])
        save_data(data)
        return '', 200
    return '', 404

@app.route('/api/logs/<int:index>', methods=['DELETE'])
def delete_log(index):
    data = load_data()
    if 0 <= index < len(data):
        data.pop(index)
        save_data(data)
        return '', 200
    return '', 404

@app.route('/api/monthly_report', methods=['GET'])
def monthly_report():
    data = load_data()
    monthly_totals = calculate_monthly_totals(data)
    pdf_buffer = generate_pdf_report(monthly_totals)
    return send_file(pdf_buffer, download_name='Monthly_Running_Km_Report.pdf', as_attachment=True, mimetype='application/pdf')

if __name__ == '__main__':
    app.run(host='10.187.128.189', port=3000, debug=True)