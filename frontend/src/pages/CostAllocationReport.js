import React, { useState, useEffect, useCallback } from 'react';
import Select from 'react-select';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { costAllocationAPI } from '../services/api'; 
import '../PremiumTheme.css';
import './CostAllocationReport.css';
// this
function CostAllocationReport() {
  const [reportData, setReportData] = useState([]);
  const [totalRow, setTotalRow] = useState(null);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100, // Increase limit for pivoted report
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    department: '',
    employeeId: '',
    payGroup: '',
    payPeriod: '',
    employer: '',
    project: '',
    section: '',
    designation: ''
  });
  const [departmentSummary, setDepartmentSummary] = useState([]);
  const [employeeSummary, setEmployeeSummary] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    departments: [],
    employees: [],
    payGroups: [],
    payPeriods: [],
    employers: [],
    projects: [],
    sections: [],
    designations: []
  });

  const fetchReportData = useCallback(async (pageNumber = pagination.page, optionsOnly = false, overrideFilters = null) => {
    try {
      setLoading(true);
      
      const currentFilters = overrideFilters || filters;
      
      // Determine mode based on optionsOnly and whether payGroup is selected
      // Mode 1: Fetch Pay Groups (initial)
      // Mode 2: Fetch cascading dropdowns (when Pay Group is selected)
      // Mode 3: Fetch report data
      let mode = 3;
      if (optionsOnly) {
        mode = currentFilters.payGroup ? 2 : 1;
      }

      const response = await costAllocationAPI.synHRM_Cost_Allocation_Report({
        ...currentFilters,
        mode,
        page: pageNumber,
        limit: pagination.limit
      });
      
      if (response.data.filters) {
        setFilterOptions(prev => ({
          ...prev,
          ...response.data.filters
        }));
      }

      // If we only wanted to refresh filter options (cascading), stop here
      if (optionsOnly) {
        setLoading(false);
        return;
      }

      if (!currentFilters.payGroup || !currentFilters.payPeriod) {
        setReportData([]);
        setTotalRow(null);
        setColumns([]);
        setDepartmentSummary([]);
        setEmployeeSummary([]);
        setPagination(prev => ({ ...prev, total: 0, totalPages: 0, page: 1 }));
        setError('Please select both Pay Group and Pay Period to generate the report.');
        return;
      }

      setReportData(response.data.reportData || []);
      setTotalRow(response.data.totalRow || null);
      setColumns(response.data.columns || []);
      setDepartmentSummary(response.data.departmentSummary || []);
      setEmployeeSummary(response.data.employeeSummary || []);

      if (response.data.pagination) {
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination.total,
          totalPages: response.data.pagination.totalPages,
          page: response.data.pagination.page
        }));
      } else {
        // For mode 3 which doesn't have explicit pagination in backend yet
        setPagination(prev => ({
          ...prev,
          total: (response.data.reportData || []).length,
          totalPages: 1,
          page: 1
        }));
      }
      setError('');
    } catch (err) {
      setError('Failed to fetch cost allocation report. Please check if the server is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit]);

  useEffect(() => {
    fetchReportData(1, true); // Only fetch filter options on mount
  }, []); // Run only once on mount

  const handleSearch = () => {
    fetchReportData(1, false);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchReportData(newPage, false);
    }
  };

  const handleSelectChange = (selectedOption, { name }) => {
    const value = selectedOption ? selectedOption.value : '';
    let updatedFilters = { ...filters, [name]: value };
    
    // Cascading logic: Reset dependent filters when parent changes
    if (name === 'payGroup') {
      updatedFilters.payPeriod = '';
      updatedFilters.employeeId = '';
    }
    
    if (name === 'department') {
      updatedFilters.employeeId = '';
    }
    
    setFilters(updatedFilters);

    // Automatically refresh filter options (dropdowns) when a filter changes
    if (name === 'payGroup' || name === 'department') {
      fetchReportData(1, true, updatedFilters);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    let updatedFilters = { ...filters, [name]: value };
    
    // Cascading logic: Reset dependent filters when parent changes
    if (name === 'payGroup') {
      updatedFilters.payPeriod = '';
      updatedFilters.employeeId = '';
    }
    
    if (name === 'department') {
      updatedFilters.employeeId = '';
    }
    
    setFilters(updatedFilters);

    // Automatically refresh filter options (dropdowns) when a filter changes
    // but don't refresh the report data yet
    if (name === 'payGroup' || name === 'department') {
      fetchReportData(1, true, updatedFilters);
    }
  };

  const clearFilters = () => {
    const emptyFilters = {
      department: '',
      employeeId: '',
      payGroup: '',
      payPeriod: '',
      employer: '',
      project: '',
      section: '',
      designation: ''
    };
    setFilters(emptyFilters);
    setReportData([]);
    setTotalRow(null);
    setColumns([]);
    setDepartmentSummary([]);
    setEmployeeSummary([]);
    setPagination(prev => ({ ...prev, total: 0, totalPages: 0, page: 1 }));
    setError('');
    
    // Refresh filter options to original state
    fetchReportData(1, true, emptyFilters);
  };

  const exportToExcel = () => {
    try {
      const exportData = reportData.map(item => {
        const row = {};
        columns.forEach(col => {
          row[col] = item[col];
        });
        return row;
      });

      // Add total row to export
      if (totalRow) {
        const totalExportRow = {};
        columns.forEach(col => {
          totalExportRow[col] = col === 'Sites' ? 'TOTAL AMOUNT' : totalRow[col];
        });
        exportData.push(totalExportRow);
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Cost Allocation");
      XLSX.writeFile(wb, `Cost_Allocation_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      setShowExportOptions(false);
    } catch (err) {
      setError('Failed to export Excel');
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF('l', 'pt', 'a4');
      
      doc.setFontSize(20);
      doc.text('Cost Allocation Report', 40, 40);
      
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 40, 60);

      const tableData = reportData.map(item => 
        columns.map(col => typeof item[col] === 'number' 
          ? item[col].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : item[col])
      );

      if (totalRow) {
        tableData.push(columns.map(col => col === 'Sites' ? 'TOTAL AMOUNT' : 
          (typeof totalRow[col] === 'number' 
            ? totalRow[col].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : totalRow[col] || '')));
      }

      autoTable(doc, {
        head: [columns.map(col => col.toUpperCase())],
        body: tableData,
        startY: 100,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 70, 229] },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
      });

      doc.save(`Cost_Allocation_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      setShowExportOptions(false);
    } catch (err) {
      console.error(err);
      setError('Failed to export PDF');
    }
  };

  const handleExportCSV = async () => {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      window.open(`/api/reports/cost-allocation/export?${queryParams}`, '_blank');
      setShowExportOptions(false);
    } catch (err) {
      setError('Failed to export CSV');
    }
  };

  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      borderRadius: '10px',
      borderColor: state.isFocused ? 'var(--primary-color)' : 'var(--border-color)',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(79, 70, 229, 0.1)' : 'none',
      '&:hover': {
        borderColor: 'var(--primary-color)'
      },
      fontSize: '0.875rem',
      minHeight: '38px',
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
    })
  };

  return (
    <div className="premium-container">
      {/* Header Section */}
      <div className="premium-header">
        <div>
          <h1 className="premium-title">Cost Allocation Report</h1>
          <p className="premium-subtitle">Detailed breakdown of payroll costs across sites and projects</p>
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

      {error && (
        <div className="alert alert-danger mb-4 shadow-sm border-0" style={{ borderRadius: '12px' }}>
          {error}
        </div>
      )}

      {/* Premium Filter Card */}
      <div className="premium-card">
        <div className="filter-grid">
          <div className="filter-control-group">
            <label className="filter-label">Pay Group <span className="text-danger">*</span></label>
            <Select
              name="payGroup"
              value={filterOptions.payGroups.find(opt => opt.id === filters.payGroup) ? { value: filters.payGroup, label: filterOptions.payGroups.find(opt => opt.id === filters.payGroup).name } : null}
              onChange={handleSelectChange}
              options={filterOptions.payGroups.map(opt => ({ value: opt.id, label: opt.name }))}
              placeholder="Select Pay Group"
              styles={customSelectStyles}
              isClearable
            />
          </div>
          <div className="filter-control-group">
            <label className="filter-label">Pay Period <span className="text-danger">*</span></label>
            <Select
              name="payPeriod"
              value={filterOptions.payPeriods.find(opt => opt.id === filters.payPeriod) ? { value: filters.payPeriod, label: filterOptions.payPeriods.find(opt => opt.id === filters.payPeriod).name } : null}
              onChange={handleSelectChange}
              options={filterOptions.payPeriods.map(opt => ({ value: opt.id, label: opt.name }))}
              placeholder={filters.payGroup ? "Select Pay Period" : "Select Pay Group first"}
              styles={customSelectStyles}
              isDisabled={!filters.payGroup}
              isClearable
            />
          </div>
          <div className="filter-control-group">
            <label className="filter-label">Employee</label>
            <Select
              name="employeeId"
              value={filterOptions.employees.find(opt => opt.id === filters.employeeId) ? { value: filters.employeeId, label: filterOptions.employees.find(opt => opt.id === filters.employeeId).name } : null}
              onChange={handleSelectChange}
              options={filterOptions.employees.map(opt => ({ value: opt.id, label: opt.name }))}
              placeholder="All Employees"
              styles={customSelectStyles}
              isClearable
            />
          </div>
          <div className="filter-control-group">
            <label className="filter-label">Employer / Company</label>
            <Select
              name="employer"
              value={filterOptions.employers.find(opt => opt.id === filters.employer) ? { value: filters.employer, label: filterOptions.employers.find(opt => opt.id === filters.employer).name } : null}
              onChange={handleSelectChange}
              options={filterOptions.employers.map(opt => ({ value: opt.id, label: opt.name }))}
              placeholder="All Employers"
              styles={customSelectStyles}
              isClearable
            />
          </div>
          <div className="filter-control-group">
            <label className="filter-label">Project / Location</label>
            <Select
              name="project"
              value={filterOptions.projects.find(opt => opt.id === filters.project) ? { value: filters.project, label: filterOptions.projects.find(opt => opt.id === filters.project).name } : null}
              onChange={handleSelectChange}
              options={filterOptions.projects.map(opt => ({ value: opt.id, label: opt.name }))}
              placeholder="All Projects"
              styles={customSelectStyles}
              isClearable
            />
          </div>
          <div className="filter-control-group">
            <label className="filter-label">Section</label>
            <Select
              name="section"
              value={filterOptions.sections.find(opt => opt.id === filters.section) ? { value: filters.section, label: filterOptions.sections.find(opt => opt.id === filters.section).name } : null}
              onChange={handleSelectChange}
              options={filterOptions.sections.map(opt => ({ value: opt.id, label: opt.name }))}
              placeholder="All Sections"
              styles={customSelectStyles}
              isClearable
            />
          </div>
          <div className="filter-control-group">
            <label className="filter-label">Department</label>
            <Select
              name="department"
              value={filterOptions.departments.find(opt => opt.id === filters.department) ? { value: filters.department, label: filterOptions.departments.find(opt => opt.id === filters.department).name } : null}
              onChange={handleSelectChange}
              options={filterOptions.departments.map(opt => ({ value: opt.id, label: opt.name }))}
              placeholder="All Departments"
              styles={customSelectStyles}
              isClearable
            />
          </div>
          <div className="filter-control-group">
            <label className="filter-label">Designation</label>
            <Select
              name="designation"
              value={filterOptions.designations.find(opt => opt.id === filters.designation) ? { value: filters.designation, label: filterOptions.designations.find(opt => opt.id === filters.designation).name } : null}
              onChange={handleSelectChange}
              options={filterOptions.designations.map(opt => ({ value: opt.id, label: opt.name }))}
              placeholder="All Designations"
              styles={customSelectStyles}
              isClearable
            />
          </div>
          <div className="filter-control-group justify-content-end">
            <button 
              className="btn-premium btn-premium-primary px-4" 
              onClick={handleSearch}
              style={{ height: '38px', marginTop: 'auto' }}
            >
              Search Report
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="premium-card p-0 overflow-hidden">
        <div className="tab-content">
          {loading ? (
            <div className="loading-overlay">
              <div className="spinner-premium"></div>
              <p>Fetching report data...</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table-premium">
                <thead>
                  <tr>
                    {columns.map((col, idx) => (
                      <th key={idx} style={{ textAlign: col === 'Sites' ? 'left' : 'right' }}>
                        {col.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length || 5}>
                        <div className="empty-state">
                          <span className="empty-state-icon">📂</span>
                          <p>No transactions found for the selected criteria.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {reportData.map((item, index) => (
                        <tr key={index}>
                          {columns.map((col, idx) => (
                            <td key={idx} style={{ 
                              textAlign: col === 'Sites' ? 'left' : 'right',
                              fontWeight: col === 'Sites' || col === 'Net Amount' ? 600 : 400
                            }}>
                              {typeof item[col] === 'number' 
                                ? item[col].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                : item[col]}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {totalRow && (
                        <tr className="total-row-premium" style={{ borderTop: '2px solid var(--border-color)', backgroundColor: 'var(--bg-light)' }}>
                          {columns.map((col, idx) => (
                            <td key={idx} style={{ 
                              textAlign: col === 'Sites' ? 'left' : 'right',
                              fontWeight: 800,
                              fontSize: '0.95rem'
                            }}>
                              {col === 'Sites' ? 'TOTAL AMOUNT' : 
                               (typeof totalRow[col] === 'number' 
                                 ? totalRow[col].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                 : totalRow[col] || '')}
                            </td>
                          ))}
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CostAllocationReport;
