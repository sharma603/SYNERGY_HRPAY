import React, { useState, useEffect, useCallback } from 'react';
import Select from 'react-select';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { costAllocationAPI, authAPI } from '../services/api';
import '../PremiumTheme.css';

function EmployeeSiteLocation() {
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
    department: '',
    designation: '',
    section: '',
    project: ''
  });

  const [masterData, setMasterData] = useState({
    departments: [],
    designations: [],
    sections: [],
    projects: []
  });

  const fetchMasterData = async () => {
    try {
      const response = await authAPI.getMasterData();
      setMasterData(response.data);
    } catch (err) {
      console.error('Error fetching master data:', err);
    }
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

  const fetchReportData = useCallback(async (pageNumber = 1, limitOverride = null) => {
    try {
      setLoading(true);
      setError('');
      const currentLimit = limitOverride || pagination.limit;
      const response = await costAllocationAPI.getEmployeeSiteLocation({
        ...filters,
        page: pageNumber,
        limit: currentLimit
      });
      
      setReportData(response.data.reportData || []);
      if (response.data.pagination) {
        setPagination(prev => ({
          ...prev,
          ...response.data.pagination,
          limit: currentLimit
        }));
      }
    } catch (err) {
      setError('Failed to fetch employee site location report. Please check if the server is running.');
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
      department: '',
      designation: '',
      section: '',
      project: ''
    });
  };

  const exportToExcel = async () => {
    try {
      setLoading(true);
      const response = await costAllocationAPI.getEmployeeSiteLocation({
        ...filters,
        page: 1,
        limit: 1000000
      });
      const allData = response.data.reportData || [];

      const exportData = allData.map(row => ({
        'EMP CODE': row.EMP_CODE,
        'EMPLOYEE NAME': row.EMP_NAME,
        'JOIN DATE': formatDate(row.EMP_JOIN_DATE),
        'DEPARTMENT': row.Department,
        'DESIGNATION': row.Designation,
        'SECTION': row.Section,
        'SITE LOCATION': row.Site_Location
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Employee Locations");
      XLSX.writeFile(wb, `Employee_Site_Locations_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error('Export to Excel failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    try {
      setLoading(true);
      const response = await costAllocationAPI.getEmployeeSiteLocation({
        ...filters,
        page: 1,
        limit: 1000000
      });
      const allData = response.data.reportData || [];

      const doc = jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      
      doc.setFontSize(16);
      doc.text("Employee Site Location Report", 14, 15);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

      const tableColumn = ["EMP CODE", "NAME", "JOIN DATE", "DEPARTMENT", "DESIGNATION", "SECTION", "SITE LOCATION"];
      const tableRows = allData.map(row => [
        row.EMP_CODE,
        row.EMP_NAME,
        formatDate(row.EMP_JOIN_DATE),
        row.Department,
        row.Designation,
        row.Section,
        row.Site_Location
  ]);

  const handleLimitChange = (e) => {
    const newLimit = e.target.value === 'all' ? 1000000 : parseInt(e.target.value);
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
    fetchReportData(1, newLimit);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchReportData(newPage);
    }
  };

  autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 28,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 70, 229] }
      });

      doc.save(`Employee_Site_Locations_${new Date().toISOString().split('T')[0]}.pdf`);
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
          <h1 className="premium-title">Employee Site Location</h1>
          
        </div>
        <div className="d-flex gap-2">
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
            <label className="form-label fw-bold small text-muted text-uppercase">Department</label>
            <Select
              name="department"
              value={masterData.departments.find(d => d.name === filters.department) ? { value: filters.department, label: filters.department } : null}
              onChange={handleSelectChange}
              options={masterData.departments.map(d => ({ value: d.name, label: d.name }))}
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
            <label className="form-label fw-bold small text-muted text-uppercase">Site / Project</label>
            <Select
              name="project"
              value={masterData.projects.find(p => p.name === filters.project) ? { value: filters.project, label: filters.project } : null}
              onChange={handleSelectChange}
              options={masterData.projects.map(p => ({ value: p.name, label: p.name }))}
              placeholder="All Projects"
              styles={customSelectStyles}
              isClearable
            />
          </div>
          <div className="col-md-8 d-flex justify-content-end gap-2 mt-3">
            <button onClick={handleSearch} className="btn-premium btn-premium-primary px-4" disabled={loading}>
              {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : <><i className="fa fa-search"></i> Search</>}
            </button>
            <button onClick={clearFilters} className="btn-premium btn-premium-secondary px-4">
              <i className="fa fa-refresh"></i> Clear Filters
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
              <p className="text-muted">Fetching location data...</p>
            </div>
          ) : reportData.length > 0 ? (
            <table className="table-premium">
              <thead>
                <tr>
                  <th>EMP CODE</th>
                  <th>EMPLOYEE NAME</th>
                  <th>JOIN DATE</th>
                  <th>DEPARTMENT</th>
                  <th>DESIGNATION</th>
                  <th>SECTION</th>
                  <th>SITE LOCATION</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((row, index) => (
                  <tr key={index}>
                    <td>{row.EMP_CODE}</td>
                    <td className="fw-bold">{row.EMP_NAME}</td>
                    <td>{formatDate(row.EMP_JOIN_DATE)}</td>
                    <td>{row.Department}</td>
                    <td>{row.Designation}</td>
                    <td>{row.Section}</td>
                    <td>
                      <span className="badge-premium badge-premium-blue">
                        {row.Site_Location || 'Not Assigned'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-5 text-center">
              <i className="fa fa-map-marker fa-3x text-muted mb-3"></i>
              <p className="text-muted">No records found matching your criteria.</p>
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
                <label className="small text-muted fw-bold mb-0">ROWS:</label>
                <select className="form-select form-select-sm" style={{ width: 'auto' }} value={pagination.limit >= 1000000 ? 'all' : pagination.limit} onChange={handleLimitChange}>
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="all">All</option>
                </select>
              </div>
            </div>
            <div className="pagination-controls">
              <button className="btn-pagination" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1}>
                <i className="fa fa-chevron-left"></i>
              </button>
              <button className="btn-pagination active">{pagination.page}</button>
              <button className="btn-pagination" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}>
                <i className="fa fa-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmployeeSiteLocation;
