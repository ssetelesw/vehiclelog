// Load logs and monthly totals on page load
window.onload = loadLogs;

// Function to format date from YYYY-MM-DD to DD-MM-YYYY
function formatDate(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
}

function loadLogs() {
    fetch('/api/logs')
        .then(response => response.json())
        .then(data => {
            // Display logs
            const tbody = document.getElementById('logBody');
            tbody.innerHTML = '';
            data.logs.forEach((entry, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${formatDate(entry.Date)}</td>
                    <td>${entry['Starting Km']}</td>
                    <td>${entry['End Km']}</td>
                    <td>${entry['Running Km']}</td>
                    <td>${entry.Purpose}</td>
                    <td>
                        <button onclick="editEntry(${index})">Edit</button>
                        <button onclick="deleteEntry(${index})">Delete</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // Display monthly totals
            const monthlyBody = document.getElementById('monthlyBody');
            monthlyBody.innerHTML = '';
            for (const [month, total] of Object.entries(data.monthly_totals)) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${month}</td>
                    <td>${total}</td>
                `;
                monthlyBody.appendChild(tr);
            }
        });
}

function addEntry() {
    const date = document.getElementById('dateInput').value;
    const startKm = parseInt(document.getElementById('startKmInput').value);
    const endKm = parseInt(document.getElementById('endKmInput').value);
    const purpose = document.getElementById('purposeInput').value;

    if (!date || isNaN(startKm) || isNaN(endKm) || !purpose) {
        alert('Please fill all fields correctly.');
        return;
    }

    if (endKm < startKm) {
        alert('End Kilometer must be greater than Start Kilometer.');
        return;
    }

    const runningKm = endKm - startKm;
    const entry = { Date: date, 'Starting Km': startKm, 'End Km': endKm, 'Running Km': runningKm, Purpose: purpose };

    fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
    }).then(() => {
        loadLogs();
        clearInputs();
    });
}

function editEntry(index) {
    fetch('/api/logs')
        .then(response => response.json())
        .then(data => {
            const entry = data.logs[index];
            const newStartKmStr = prompt('Edit Starting Km (leave blank to keep unchanged):', entry['Starting Km']);
            const newEndKmStr = prompt('Edit End Km (leave blank to keep unchanged):', entry['End Km']);
            const newPurpose = prompt('Edit Purpose (leave blank to keep unchanged):', entry.Purpose);

            // Parse inputs, keep original if blank or invalid
            const newStartKm = newStartKmStr === '' || isNaN(parseInt(newStartKmStr)) ? entry['Starting Km'] : parseInt(newStartKmStr);
            const newEndKm = newEndKmStr === '' || isNaN(parseInt(newEndKmStr)) ? entry['End Km'] : parseInt(newEndKmStr);
            const updatedPurpose = newPurpose === '' ? entry.Purpose : newPurpose;

            // Validate if both are provided or updated
            if (newStartKm !== entry['Starting Km'] || newEndKm !== entry['End Km']) {
                if (newEndKm < newStartKm) {
                    alert('End Kilometer must be greater than Start Kilometer.');
                    return;
                }
            }

            const updatedEntry = {
                'Starting Km': newStartKm,
                'End Km': newEndKm,
                'Running Km': newEndKm - newStartKm,
                Purpose: updatedPurpose
            };

            fetch(`/api/logs/${index}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedEntry)
            }).then(() => loadLogs());
        });
}

function deleteEntry(index) {
    if (confirm('Are you sure you want to delete this entry?')) {
        fetch(`/api/logs/${index}`, {
            method: 'DELETE'
        }).then(() => loadLogs());
    }
}

function clearInputs() {
    document.getElementById('dateInput').value = '';
    document.getElementById('startKmInput').value = '';
    document.getElementById('endKmInput').value = '';
    document.getElementById('purposeInput').value = '';
}

function downloadMonthlyReport() {
    fetch('/api/monthly_report')
        .then(response => response.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Monthly_Running_Km_Report.pdf';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        });
}