import React, { useState, useEffect } from 'react';
import { Spinner, Alert, Form, Dropdown, ButtonGroup } from 'react-bootstrap';
import { employeeAPI } from '../services/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../PremiumTheme.css';

const ALL_COLUMNS = [
  { key: 'EMP_Slno', label: 'SL NO' },
  { key: 'EMP_IMAGE', label: 'PHOTO' },
  { key: 'EMP_Code', label: 'Emp ID' },
  { key: 'EMP_Name', label: 'NAME' },
  { key: 'EMP_LOC_DR', label: 'LOC' },
  { key: 'EMP_DEPT_DR', label: 'DEPT' },
  { key: 'EMP_DESIG_DR', label: 'DESIG' },
  { key: 'EMP_DOB', label: 'DOB' },
  { key: 'EMP_NATION_DR', label: 'NATION' },
  { key: 'EMP_RELIGION_DR', label: 'RELIGION' },
  { key: 'EMP_PREV_ID', label: 'PREV ID' },
  { key: 'EMP_JOIN_DATE', label: 'JOIN DATE' },
  { key: 'EMP_ADDRESS', label: 'ADDRESS' },
  { key: 'EMP_LAB_NO', label: 'LAB NO' },
  { key: 'EMP_MOL_NO', label: 'MOL NO' },
  { key: 'EMP_OT_DR', label: 'OT' },
  { key: 'EMP_BANK_DR', label: 'BANK' },
  { key: 'EMP_BRANCH', label: 'BRANCH' },
  { key: 'EMP_AC_NO', label: 'A/C NO' },
  { key: 'EMP_SWIFT_CODE', label: 'SWIFT' },
  { key: 'EMP_UNIQ_CODE', label: 'UNIQ CODE' },
  { key: 'EMP_SEPERATION', label: 'SEPERATION' },
];

const DEFAULT_COLUMNS = ['EMP_Slno', 'EMP_IMAGE', 'EMP_Code', 'EMP_Name', 'EMP_LOC_DR', 'EMP_DEPT_DR', 'EMP_DESIG_DR', 'EMP_JOIN_DATE'];

function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [exportLoading, setExportLoading] = useState(false);

  // Column Customization State
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_COLUMNS);

  useEffect(() => {
    fetchEmployees(currentPage, pageSize, searchTerm);
  }, [currentPage, pageSize]);

  const fetchEmployees = async (page, limit, search = '') => {
    try {
      setLoading(true);
      const response = await employeeAPI.getAll(page, limit, search);
      const { data, pagination } = response.data;
      setEmployees(data);
      setTotalPages(pagination.totalPages);
      setTotalRecords(pagination.total);
      setError('');
    } catch (err) {
      setError('Failed to fetch employees. Please ensure the backend is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchEmployees(1, pageSize, searchTerm);
  };

  const handleSearchClear = () => {
    setSearchTerm('');
    setCurrentPage(1);
    fetchEmployees(1, pageSize, '');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const toggleColumn = (columnKey) => {
    setVisibleColumns(prev =>
      prev.includes(columnKey)
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey]
    );
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getExportData = async () => {
    const response = await employeeAPI.getAll(1, totalRecords);
    const allData = response.data.data;

    return allData.map(emp => {
      const obj = {};
      ALL_COLUMNS.filter(col => visibleColumns.includes(col.key)).forEach(col => {
        obj[col.label] = col.key.includes('DATE') || col.key.includes('DOB')
          ? formatDate(emp[col.key])
          : emp[col.key] || '-';
      });
      return obj;
    });
  };

  const exportToExcel = async () => {
    try {
      setExportLoading(true);
      const exportData = await getExportData();
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Employees");
      XLSX.writeFile(wb, "Employee_List.xlsx");
    } catch (err) {
      setError('Excel export failed');
    } finally {
      setExportLoading(false);
    }
  };

  const exportToCSV = async () => {
    try {
      setExportLoading(true);
      const exportData = await getExportData();
      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "Employee_List.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError('CSV export failed');
    } finally {
      setExportLoading(false);
    }
  };

  const exportToPDF = async () => {
    try {
      setExportLoading(true);
      const exportData = await getExportData();
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation

      const headers = ALL_COLUMNS.filter(col => visibleColumns.includes(col.key)).map(col => col.label);
      const body = exportData.map(obj => Object.values(obj));

      doc.text("Employee List", 14, 15);
      autoTable(doc, {
        head: [headers],
        body: body,
        startY: 20,
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 41, 59] } // Slate 800
      });

      doc.save("Employee_List.pdf");
    } catch (err) {
      setError('PDF export failed');
      console.error(err);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="premium-container">
      <div className="premium-header">
        <div>
          <h1 className="premium-title">Employee Management</h1>
        </div>
        <div className="d-flex gap-3 align-items-center flex-wrap">
          <form onSubmit={handleSearch} className="search-container-premium">
            <i className="fa fa-search search-icon-premium"></i>
            <input 
              type="text" 
              className="search-input-premium" 
              placeholder="Search by Name or ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button type="button" className="search-clear-btn" onClick={handleSearchClear}>
                <i className="fa fa-times"></i>
              </button>
            )}
            <button type="submit" className="btn-search-premium">Search</button>
          </form>

          <Dropdown as={ButtonGroup}>
            <Dropdown.Toggle className="btn-premium btn-premium-secondary" id="column-dropdown">
              <i className="fa fa-cog me-1"></i> Columns
            </Dropdown.Toggle>
            <Dropdown.Menu className="shadow-lg border-0" style={{ maxHeight: '400px', overflowY: 'auto', padding: '0.5rem' }}>
              <div className="px-3 py-2 fw-bold text-muted small text-uppercase">Visible Columns</div>
              {ALL_COLUMNS.map(col => (
                <div key={col.key} className="dropdown-item py-1">
                  <Form.Check
                    type="checkbox"
                    id={`col-${col.key}`}
                    label={col.label}
                    checked={visibleColumns.includes(col.key)}
                    onChange={() => toggleColumn(col.key)}
                  />
                </div>
              ))}
            </Dropdown.Menu>
          </Dropdown>

          <Dropdown as={ButtonGroup}>
            <Dropdown.Toggle
              className="btn-premium btn-premium-primary"
              disabled={exportLoading || employees.length === 0}
            >
              {exportLoading ? 'Exporting...' : <span><i className="fa fa-download me-1"></i> Export Data</span>}
            </Dropdown.Toggle>
            <Dropdown.Menu className="shadow-lg border-0">
              <Dropdown.Item onClick={exportToExcel}>Excel (.xlsx)</Dropdown.Item>
              <Dropdown.Item onClick={exportToCSV}>CSV (.csv)</Dropdown.Item>
              <Dropdown.Item onClick={exportToPDF}>PDF (.pdf)</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      <div className="premium-card p-0 overflow-hidden">
        {loading ? (
          <div className="loading-overlay">
            <div className="spinner-premium"></div>
            <p>Loading employee data...</p>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="table-premium mb-0">
                <thead>
                  <tr>
                    {ALL_COLUMNS.filter(col => visibleColumns.includes(col.key)).map(col => (
                      <th key={col.key}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan={visibleColumns.length}>
                        <div className="empty-state">
                          <i className="fa fa-users empty-state-icon" style={{ fontSize: '2rem', color: '#94a3b8', marginBottom: '1rem', display: 'block' }}></i>
                          <p>No employees found.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    employees.map((emp, idx) => (
                      <tr key={emp.EMP_Slno || idx}>
                        {ALL_COLUMNS.filter(col => visibleColumns.includes(col.key)).map(col => (
                          <td key={col.key}>
                            {col.key === 'EMP_IMAGE' ? (
                              <div className="table-avatar-container">
                                {emp.EMP_IMAGE ? (
                                  <img 
                                    src={`data:image/jpeg;base64,${emp.EMP_IMAGE}`} 
                                    alt={emp.EMP_Name} 
                                    className="table-avatar-img"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div className="table-avatar-fallback" style={{ display: emp.EMP_IMAGE ? 'none' : 'flex' }}>
                                  {emp.EMP_Name?.charAt(0).toUpperCase() || '?'}
                                </div>
                              </div>
                            ) : col.key.includes('DATE') || col.key.includes('DOB')
                              ? formatDate(emp[col.key])
                              : emp[col.key] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {employees.length > 0 && (
              <div className="pagination-container-premium">
                <div className="pagination-info">
                  Showing <span className="fw-bold">{(currentPage - 1) * pageSize + 1}</span> to <span className="fw-bold">{Math.min(currentPage * pageSize, totalRecords)}</span> of <span className="fw-bold">{totalRecords}</span> personnel
                </div>
                <div className="pagination-controls">
                  <button
                    className="btn-pagination"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    &laquo;
                  </button>

                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                      return (
                        <button
                          key={pageNum}
                          className={`btn-pagination ${currentPage === pageNum ? 'active' : ''}`}
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                      return <span key={pageNum} className="align-self-center">...</span>;
                    }
                    return null;
                  })}

                  <button
                    className="btn-pagination"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    &raquo;
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Employees;
