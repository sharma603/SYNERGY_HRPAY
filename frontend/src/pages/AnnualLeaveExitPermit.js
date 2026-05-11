import React, { useState, useEffect, useCallback } from 'react';
import Select from 'react-select';
import { Dropdown, Form } from 'react-bootstrap';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { costAllocationAPI, authAPI } from '../services/api';
import '../PremiumTheme.css';

function AnnualLeaveExitPermit() {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    department: '',
    designation: '',
    section: '',
    employee: '',
    company: ''
  });

  const [masterData, setMasterData] = useState({
    departments: [],
    designations: [],
    employees: [],
    sections: [],
    companies: []
  });

  const fetchMasterData = async () => {
    try {
      const response = await authAPI.getMasterData();
      setMasterData(response.data);
    } catch (err) {
      console.error('Error fetching master data:', err);
    }
  };

  const ALL_COLUMNS = [
    { id: 'Request From', label: 'Requested By', default: true },
    { id: 'Approved By', label: 'Approved By', default: true },
    { id: 'PRC_DESC', label: 'Process', default: true },
    { id: 'PFT_DATE', label: 'Request Date', default: true },
    { id: 'PFT_FROM_DT', label: 'Start Date', default: true },
    { id: 'PFT_TO_DT', label: 'End Date', default: true },
    { id: 'PFT_NEXT_PRIORITY', label: 'Priority', default: true },
    { id: 'PFT_COMPLETE_FLG', label: 'Completed', default: true },
    { id: 'PFT_CANCEL_FLG', label: 'Cancelled', default: true },
    { id: 'PFT_EMPLOYEE_DR', label: 'Emp ID', default: false },
    { id: 'PFT_HRM_ESS_PROCESS_FLOW_DR', label: 'Flow ID', default: false },
    { id: 'PFT_Current_Status', label: 'Status', default: true },
    { id: 'PFT_NEXT_WAITING_USER_ID', label: 'Next User', default: false },
    { id: 'PFT_LEAV_REPORTING_BACK_DT', label: 'Reporting Back', default: true },
    { id: 'PFT_LEAV_CONTACT_PHONE', label: 'Phone', default: false },
    { id: 'PFT_LEAV_CONTACT_HOME', label: 'Home Phone', default: false },
    { id: 'PFT_LEAV_CONTACT_ADDRESS', label: 'Address', default: false },
    { id: 'PFT_COMMENTS', label: 'Comments', default: false },
    { id: 'PFT_CREATE_DT', label: 'Created At', default: false },
    { id: 'PFT_LEAVE_OUT_OF_COUNTRY', label: 'Out of Country', default: false },
    { id: 'PFT_LEAVE_TYPE', label: 'Leave Type', default: true },
    { id: 'RequestedEmpSLno', label: 'Emp SL No', default: false },
    { id: 'RequestedBy_Emp', label: 'Requested By (Emp)', default: false },
    { id: 'PFA_PRIORITY', label: 'Auth Priority', default: false },
    { id: 'PFA_ESCALTION_PERIOD', label: 'Escalation', default: false },
    { id: 'PFA_AUTH_LIST_DR', label: 'Auth List', default: false },
    { id: 'PFT_LAST_AUTH_DT', label: 'Last Auth Date', default: false },
    { id: 'PFT_SLNO', label: 'SL No', default: false },
    { id: 'PFT_REJECT_FLG', label: 'Rejected', default: false },
    { id: 'EMP_EXIT_PERMIT', label: 'Exit Permit', default: true }
  ];

  const [visibleColumns, setVisibleColumns] = useState(
    ALL_COLUMNS.filter(col => col.default).map(col => col.id)
  );

  const toggleColumn = (columnId) => {
    setVisibleColumns(prev => 
      prev.includes(columnId) 
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const getHeaderLabel = (key) => {
    const labels = {
      'Request From': 'Requested By',
      'Approved By': 'Approved By',
      'PRC_DESC': 'Process',
      'PFT_DATE': 'Request Date',
      'PFT_FROM_DT': 'Start Date',
      'PFT_TO_DT': 'End Date',
      'PFT_NEXT_PRIORITY': 'Priority',
      'PFT_COMPLETE_FLG': 'Completed',
      'PFT_CANCEL_FLG': 'Cancelled',
      'PFT_EMPLOYEE_DR': 'Emp ID',
      'PFT_HRM_ESS_PROCESS_FLOW_DR': 'Flow ID',
      'PFT_Current_Status': 'Status',
      'PFT_NEXT_WAITING_USER_ID': 'Next User',
      'PFT_LEAV_REPORTING_BACK_DT': 'Reporting Back',
      'PFT_LEAV_CONTACT_PHONE': 'Phone',
      'PFT_LEAV_CONTACT_HOME': 'Home Phone',
      'PFT_LEAV_CONTACT_ADDRESS': 'Address',
      'PFT_COMMENTS': 'Comments',
      'PFT_CREATE_DT': 'Created At',
      'PFT_LEAVE_OUT_OF_COUNTRY': 'Out of Country',
      'PFT_LEAVE_TYPE': 'Leave Type',
      'RequestedEmpSLno': 'Emp SL No',
      'RequestedBy_Emp': 'Requested By (Emp)',
      'PFA_PRIORITY': 'Auth Priority',
      'PFA_ESCALTION_PERIOD': 'Escalation',
      'PFA_AUTH_LIST_DR': 'Auth List',
      'PFT_LAST_AUTH_DT': 'Last Auth Date',
      'PFT_SLNO': 'SL No',
      'PFT_REJECT_FLG': 'Rejected',
      'EMP_EXIT_PERMIT': 'Exit Permit'
    };
    return labels[key] || key.replace(/_/g, ' ');
  };

  const fetchReportData = useCallback(async (pageNumber = 1, limitOverride = null) => {
    try {
      setLoading(true);
      setError('');
      const currentLimit = limitOverride || pagination.limit;
      const response = await costAllocationAPI.getAnnualLeaveExitPermit({
        ...filters,
        page: pageNumber,
        limit: currentLimit
      });
      
      setReportData(response.data.reportData || []);
      if (response.data.pagination) {
        setPagination(prev => ({
          ...prev,
          ...response.data.pagination,
          limit: currentLimit // Ensure limit is synced
        }));
      }
    } catch (err) {
      setError('Failed to fetch annual leave exit permit report. Please check if the server is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit]);

  useEffect(() => {
    fetchMasterData();
    fetchReportData(1);
  }, []);

  const handleSearch = () => {
    fetchReportData(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchReportData(newPage);
    }
  };

  const handleLimitChange = (e) => {
    const newLimit = e.target.value === 'all' ? 1000000 : parseInt(e.target.value);
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
    // We need to fetch with the new limit immediately
    fetchReportData(1, newLimit);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (selectedOption, { name }) => {
    const value = selectedOption ? selectedOption.value : '';
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      fromDate: '',
      toDate: '',
      department: '',
      designation: '',
      section: '',
      employee: '',
      company: ''
    });
  };

  const exportToExcel = async () => {
    try {
      setLoading(true);
      // Fetch all data for export
      const response = await costAllocationAPI.getAnnualLeaveExitPermit({
        ...filters,
        page: 1,
        limit: 1000000 // Large limit to get all records
      });
      const allData = response.data.reportData || [];

      const exportData = allData.map(row => {
        const newRow = {};
        visibleColumns.forEach(key => {
          let val = row[key];
          if (key.includes('_DT') || key.includes('Date')) {
            val = formatDate(val);
          }
          newRow[getHeaderLabel(key)] = val;
        });
        return newRow;
      });
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Exit Permits");
      XLSX.writeFile(wb, `Annual_Leave_Exit_Permits_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error('Export to Excel failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    try {
      setLoading(true);
      // Fetch all data for export
      const response = await costAllocationAPI.getAnnualLeaveExitPermit({
        ...filters,
        page: 1,
        limit: 1000000
      });
      const allData = response.data.reportData || [];

      const doc = jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      
      // Header
      doc.setFontSize(18);
      doc.setTextColor(40);
      doc.text("Annual Leave Exit Permit Report", 14, 15);
      
      // Filter Info
      doc.setFontSize(10);
      doc.setTextColor(100);
      const filterText = `Period: ${filters.fromDate || 'All'} to ${filters.toDate || 'All'} | Generated on: ${new Date().toLocaleDateString()}`;
      doc.text(filterText, 14, 22);

      // Define columns for PDF based on visible columns
      const pdfColumns = ALL_COLUMNS
        .filter(col => visibleColumns.includes(col.id))
        .map(col => ({ header: col.label, dataKey: col.id }));

      const tableRows = allData.map(row => {
        const newRow = {};
        pdfColumns.forEach(col => {
          let val = row[col.dataKey];
          if (col.dataKey.includes('_DT') || col.dataKey.includes('Date')) {
            val = formatDate(val);
          } else if (typeof val === 'boolean') {
            val = val ? 'Yes' : 'No';
          }
          newRow[col.dataKey] = val || '-';
        });
        return newRow;
      });

      autoTable(doc, {
        columns: pdfColumns,
        body: tableRows,
        startY: 28,
        theme: 'grid',
        styles: { fontSize: pdfColumns.length > 10 ? 6 : 8, cellPadding: 2 },
        headStyles: { 
          fillColor: [79, 70, 229], 
          textColor: [255, 255, 255],
          fontSize: pdfColumns.length > 10 ? 7 : 9,
          fontStyle: 'bold'
        },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { top: 30 },
        didDrawPage: (data) => {
          // Footer with page number
          const str = 'Page ' + doc.internal.getNumberOfPages();
          doc.setFontSize(10);
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
          doc.text(str, data.settings.margin.left, pageHeight - 10);
        }
      });

      doc.save(`Annual_Leave_Exit_Permits_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Export to PDF failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      borderRadius: '8px',
      borderColor: state.isFocused ? 'var(--primary-color)' : '#dee2e6',
      boxShadow: state.isFocused ? '0 0 0 1px var(--primary-color)' : 'none',
      '&:hover': {
        borderColor: state.isFocused ? 'var(--primary-color)' : '#ced4da'
      },
      fontSize: '0.875rem',
      minHeight: '31px',
      backgroundColor: 'white'
    }),
    option: (base, state) => ({
      ...base,
      fontSize: '0.875rem',
      backgroundColor: state.isSelected ? 'var(--primary-color)' : state.isFocused ? 'rgba(79, 70, 229, 0.05)' : 'white',
      color: state.isSelected ? 'white' : 'var(--text-main)',
      '&:active': {
        backgroundColor: 'var(--primary-color)'
      }
    }),
    placeholder: (base) => ({
      ...base,
      color: '#94a3b8'
    }),
    singleValue: (base) => ({
      ...base,
      color: 'var(--text-main)'
    }),
    dropdownIndicator: (base) => ({
      ...base,
      padding: '2px 8px'
    }),
    clearIndicator: (base) => ({
      ...base,
      padding: '2px 8px'
    }),
    valueContainer: (base) => ({
      ...base,
      padding: '0 8px'
    })
  };

  return (
    <div className="premium-container">
      <div className="premium-header">
        <div>
          <h1 className="premium-title">Annual Leave Exit Permit</h1>
          <p className="premium-subtitle">Manage and track employee exit permits for annual leaves</p>
        </div>
        <div className="d-flex gap-2">
          <Dropdown autoClose="outside">
            <Dropdown.Toggle variant="outline-primary" id="dropdown-column-toggle" className="btn-premium btn-premium-secondary">
              <i className="fa fa-columns"></i> <span>Columns</span>
            </Dropdown.Toggle>
            <Dropdown.Menu className="column-toggle-menu shadow" style={{ maxHeight: '400px', overflowY: 'auto', width: '250px', padding: '10px' }}>
              <div className="dropdown-header px-2 py-1 fw-bold text-uppercase small text-muted">Select Columns</div>
              {ALL_COLUMNS.map(col => (
                <div key={col.id} className="px-2 py-1">
                  <Form.Check 
                    type="checkbox"
                    id={`col-${col.id}`}
                    label={col.label}
                    checked={visibleColumns.includes(col.id)}
                    onChange={() => toggleColumn(col.id)}
                    className="small"
                  />
                </div>
              ))}
            </Dropdown.Menu>
          </Dropdown>
          <button onClick={exportToExcel} className="btn-premium btn-premium-secondary" disabled={reportData.length === 0}>
            <i className="fa fa-file-excel-o"></i> <span>Export Excel</span>
          </button>
          <button onClick={exportToPDF} className="btn-premium btn-premium-secondary" disabled={reportData.length === 0}>
            <i className="fa fa-file-pdf-o"></i> <span>Export PDF</span>
          </button>
        </div>
      </div>

      <div className="premium-card">
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label fw-bold small text-muted text-uppercase">From Date</label>
            <input
              type="date"
              name="fromDate"
              value={filters.fromDate}
              onChange={handleFilterChange}
              className="form-control form-control-sm"
              placeholder="dd-mm-yyyy"
            />
            <div className="form-text text-muted mt-1" style={{ fontSize: '0.7rem' }}>You can type or use the picker</div>
          </div>
          <div className="col-md-4">
            <label className="form-label fw-bold small text-muted text-uppercase">To Date</label>
            <input
              type="date"
              name="toDate"
              value={filters.toDate}
              onChange={handleFilterChange}
              className="form-control form-control-sm"
              placeholder="dd-mm-yyyy"
            />
            <div className="form-text text-muted mt-1" style={{ fontSize: '0.7rem' }}>You can type or use the picker</div>
          </div>
          <div className="col-md-4">
            <label className="form-label fw-bold small text-muted text-uppercase">Department</label>
            <Select
              name="department"
              value={masterData.departments.find(d => d.id === filters.department) ? { value: filters.department, label: masterData.departments.find(d => d.id === filters.department).name } : null}
              onChange={handleSelectChange}
              options={masterData.departments.map(d => ({ value: d.id, label: d.name }))}
              placeholder="All Departments"
              styles={customSelectStyles}
              isClearable
            />
          </div>
          <div className="col-md-4">
            <label className="form-label fw-bold small text-muted text-uppercase">Designation</label>
            <Select
              name="designation"
              value={masterData.designations.find(d => d.name === filters.designation) ? { value: filters.designation, label: filters.designation } : null}
              onChange={handleSelectChange}
              options={masterData.designations.map(d => ({ value: d.name, label: d.name }))}
              placeholder="All Designations"
              styles={customSelectStyles}
              isClearable
            />
          </div>
          <div className="col-md-4">
            <label className="form-label fw-bold small text-muted text-uppercase">Section</label>
            <Select
              name="section"
              value={masterData.sections.find(s => s.name === filters.section) ? { value: filters.section, label: filters.section } : null}
              onChange={handleSelectChange}
              options={masterData.sections.map(s => ({ value: s.name, label: s.name }))}
              placeholder="All Sections"
              styles={customSelectStyles}
              isClearable
            />
          </div>
          <div className="col-md-4">
            <label className="form-label fw-bold small text-muted text-uppercase">Employee</label>
            <Select
              name="employee"
              value={masterData.employees.find(e => e.id === filters.employee) ? { value: filters.employee, label: masterData.employees.find(e => e.id === filters.employee).name } : null}
              onChange={handleSelectChange}
              options={masterData.employees.map(e => ({ value: e.id, label: e.name }))}
              placeholder="All Employees"
              styles={customSelectStyles}
              isClearable
            />
          </div>
          <div className="col-md-4">
            <label className="form-label fw-bold small text-muted text-uppercase">Company</label>
            <Select
              name="company"
              value={masterData.companies.find(c => c.id === filters.company) ? { value: filters.company, label: masterData.companies.find(c => c.id === filters.company).name } : null}
              onChange={handleSelectChange}
              options={masterData.companies.map(c => ({ value: c.id, label: c.name }))}
              placeholder="All Companies"
              styles={customSelectStyles}
              isClearable
            />
          </div>
          <div className="col-md-8 d-flex align-items-end gap-2">
            <button onClick={handleSearch} className="btn-premium btn-premium-primary px-4" disabled={loading}>
              {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : <><i className="fa fa-search"></i> Search</>}
            </button>
            <button onClick={clearFilters} className="btn-premium btn-premium-secondary px-4">
             <i className="fa fa-refresh"></i> Clear
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="premium-card p-0 overflow-hidden">
        <div className="table-responsive">
          {loading ? (
            <div className="loading-overlay">
              <div className="spinner-premium"></div>
              <p className="text-muted">Fetching report data...</p>
            </div>
          ) : reportData.length > 0 ? (
            <table className="table-premium">
              <thead>
                <tr>
                  {visibleColumns.map(colId => (
                    <th key={colId}>{getHeaderLabel(colId)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.map((row, index) => (
                  <tr key={index}>
                    {visibleColumns.map((key, i) => {
                      let val = row[key];
                      
                      // Format specific columns
                      if (key.includes('_DT') || key.includes('Date')) {
                        val = formatDate(val);
                      } else if (typeof val === 'boolean') {
                        val = val ? <span className="badge-premium badge-premium-green">Yes</span> : <span className="badge-premium badge-premium-red">No</span>;
                      } else if (val === null || val === undefined) {
                        val = '-';
                      }

                      return <td key={i}>{val}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-5 text-center">
              <i className="fa fa-folder-open-o fa-3x text-muted mb-3"></i>
              <p className="text-muted">No data found for the selected criteria.</p>
            </div>
          )}
        </div>
        
        {reportData.length > 0 && (
          <div className="pagination-container-premium">
            <div className="d-flex align-items-center gap-4">
              <div className="pagination-info">
                Showing <strong>{((pagination.page - 1) * (pagination.limit >= 1000000 ? pagination.total : pagination.limit)) + 1}</strong> to <strong>{Math.min(pagination.page * pagination.limit, pagination.total)}</strong> of <strong>{pagination.total}</strong> results
              </div>
              
              <div className="d-flex align-items-center gap-2">
                <label className="small text-muted fw-bold mb-0">ROWS PER PAGE:</label>
                <select 
                  className="form-select form-select-sm" 
                  style={{ width: 'auto' }}
                  value={pagination.limit >= 1000000 ? 'all' : pagination.limit}
                  onChange={handleLimitChange}
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="all">All</option>
                </select>
              </div>
            </div>

            <div className="pagination-controls">
              <button 
                className="btn-pagination" 
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                <i className="fa fa-chevron-left"></i>
              </button>
              
              {[...Array(pagination.totalPages)].map((_, i) => {
                const pageNum = i + 1;
                // Show first page, last page, current page, and one page around current
                if (
                  pageNum === 1 || 
                  pageNum === pagination.totalPages || 
                  (pageNum >= pagination.page - 1 && pageNum <= pagination.page + 1)
                ) {
                  return (
                    <button 
                      key={pageNum}
                      className={`btn-pagination ${pagination.page === pageNum ? 'active' : ''}`}
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                } else if (
                  pageNum === pagination.page - 2 || 
                  pageNum === pagination.page + 2
                ) {
                  return <span key={pageNum} className="pagination-ellipsis">...</span>;
                }
                return null;
              })}

              <button 
                className="btn-pagination" 
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                <i className="fa fa-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AnnualLeaveExitPermit;

