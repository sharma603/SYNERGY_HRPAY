import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Select, { components } from 'react-select';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { costAllocationAPI } from '../services/api';
import '../PremiumTheme.css';
import './CostAllocationMonth.css';
// this
function CostAllocationMonthWithFilter() {
  const [reportData, setReportData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [totalRow, setTotalRow] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);

  const [filters, setFilters] = useState({
    payGroup: '',
    payPeriods: [],
    designations: [],
    employees: [],
    projects: [],
    sections: [],
    companies: [],
    departments: [],
    employers: []
  });

  const [filterOptions, setFilterOptions] = useState({
    payGroups: [],
    payPeriods: [],
    designations: [],
    employees: [],
    projects: [],
    sections: [],
    companies: [],
    departments: [],
    employers: []
  });

  const fetchFilterOptions = useCallback(async (currentFilters = filters) => {
    try {
      // Helper to normalize filter options - try common column names
      const normalize = (arr) => {
        if (!arr || !Array.isArray(arr)) return [];
        return arr.map(item => {
          // Find the best candidate for "name"
          let name = item.name || 
                       item.EMP_Name || 
                       item.EMP_NAME ||
                       item.COM_DESC || 
                       item.COM_Desc ||
                       item.COM_Name || 
                       item.COM_NAME ||
                       item.HRM_PAY_PERIOD_DESC || 
                       item.HRM_PAY_GROUP_DESC ||
                       (typeof item === 'string' ? item : Object.values(item).find(v => typeof v === 'string') || 'Unknown');
          
          // Special handling for employees: Include both Code and Name for better filtering
          if (item.EMP_Code && item.EMP_Name) {
            name = `${item.EMP_Code} - ${item.EMP_Name.trim()}`;
          } else if (typeof name === 'string') {
            name = name.trim();
          }

          const id = item.id || 
                     item.COM_SLNO || 
                     item.COM_Slno ||
                     item.EMP_Slno || 
                     item.EMP_SLNO ||
                     item.HRM_PAY_PERIOD_SLNO || 
                     item.HRM_PAY_GROUP_SLNO ||
                     item.ID || item.Id ||
                     (typeof Object.values(item).find(v => typeof v === 'number') !== 'undefined' ? Object.values(item).find(v => typeof v === 'number') : Object.values(item)[0]);
          
          return { ...item, name, id };
        });
      };

      // 1. Fetch Pay Groups if not already fetched
      let payGroups = filterOptions.payGroups;
      if (payGroups.length === 0) {
        const pgResponse = await costAllocationAPI.synHRM_Cost_Allocation_Report({ mode: 1 });
        payGroups = normalize(pgResponse.data.filters.payGroups || []);
      }
      
      const activePayGroup = currentFilters.payGroup || (payGroups.length > 0 ? payGroups[0].id : null);
      
      if (activePayGroup) {
        // 2. Fetch all cascading filters based on selected Pay Group
        const response = await costAllocationAPI.synHRM_Cost_Allocation_Report({ 
          mode: 2, 
          payGroup: activePayGroup 
        });
        
        const f = response.data.filters;

        setFilterOptions({
          payGroups: payGroups,
          payPeriods: normalize(f.payPeriods),
          designations: normalize(f.designations),
          employees: normalize(f.employees),
          projects: normalize(f.projects),
          sections: normalize(f.sections),
          companies: normalize(f.companies),
          departments: normalize(f.departments),
          employers: normalize(f.employers)
        });

        // Set initial pay group if none selected
        if (!currentFilters.payGroup && activePayGroup) {
          setFilters(prev => ({ ...prev, payGroup: activePayGroup }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch filter options:', err);
    }
  }, [filterOptions.payGroups, filters])

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const handlePayGroupChange = (selectedOption) => {
    const newPayGroup = selectedOption ? selectedOption.value : '';
    const updatedFilters = {
      ...filters,
      payGroup: newPayGroup,
      payPeriods: [],
      designations: [],
      employees: [],
      projects: [],
      sections: [],
      companies: [],
      departments: [],
      employers: []
    };
    setFilters(updatedFilters);
    fetchFilterOptions(updatedFilters);
  };

  const fetchReportData = async () => {
    if (filters.payPeriods.length === 0) {
      setError('Please select at least one Pay Period');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Sending all filters to the API
      const response = await costAllocationAPI.synDesignationMultiPeriodSummaryWithFilters({
        payPeriods: filters.payPeriods.join(','),
        designations: filters.designations.join(','),
        employees: filters.employees.join(','),
        projects: filters.projects.join(','),
        sections: filters.sections.join(','),
        companies: filters.companies.join(','),
        departments: filters.departments.join(','),
        employers: filters.employers.join(',')
      });

      const data = response.data.reportData || [];
      const cols = response.data.columns || [];
      setReportData(data);
      setColumns(cols);
      setCompanyName(response.data.companyName || '');

      // Calculate totals for Amount columns only
      if (data.length > 0 && cols.length > 0) {
        const totals = {};
        cols.forEach((col, idx) => {
          if (idx === 0) {
            totals[col] = 'TOTAL AMOUNT';
          } else if (col.includes('Amount')) {
            totals[col] = data.reduce((sum, row) => sum + (Number(row[col]) || 0), 0);
          } else {
            totals[col] = '';
          }
        });
        setTotalRow(totals);
      } else {
        setTotalRow(null);
      }
    } catch (err) {
      setError('Failed to fetch summary report');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMultiSelectChange = (selectedOptions, { name }) => {
    const values = selectedOptions ? selectedOptions.map(opt => opt.value) : [];
    setFilters(prev => ({
      ...prev,
      [name]: values
    }));
  };

  const Option = (props) => {
    return (
      <components.Option {...props}>
        <div className="d-flex align-items-center">
          <input
            type="checkbox"
            checked={props.isSelected}
            onChange={() => null}
            className="form-check-input me-2"
            style={{ cursor: 'pointer', flexShrink: 0, width: '14px', height: '14px' }}
          />
          <span style={{
            fontSize: '0.75rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {props.label}
          </span>
        </div>
      </components.Option>
    );
  };

  const MultiValue = (props) => (
    <components.MultiValue {...props}>
      <span>{props.data.label}</span>
    </components.MultiValue>
  );

  const ValueContainer = ({ children, ...props }) => {
    const { getValue, hasValue } = props;
    const selected = getValue();
    const allOptions = props.options.filter(opt => opt.value !== '*');

    if (!hasValue) {
      return (
        <components.ValueContainer {...props}>
          {children}
        </components.ValueContainer>
      );
    }

    const selectedCount = selected.length;
    const isAllSelected = selectedCount === allOptions.length;

    if (selectedCount > 2) {
      return (
        <components.ValueContainer {...props}>
          <div style={{ padding: '2px 8px', fontWeight: 600, color: 'var(--primary-color)', fontSize: '0.75rem' }}>
            {isAllSelected ? 'All Selected' : `${selectedCount} Selected`}
          </div>
          {children.filter(child => !Array.isArray(child))}
        </components.ValueContainer>
      );
    }

    return (
      <components.ValueContainer {...props}>
        {children}
      </components.ValueContainer>
    );
  };

  const selectAllOption = { label: "Select All", value: "*" };

  const getOptions = (options) => [selectAllOption, ...options];

  const handleSelectAll = (selected, field, allOptions) => {
    if (selected !== null && selected.length > 0 && selected[selected.length - 1].value === "*") {
      if (filters[field].length === allOptions.length) {
        setFilters(prev => ({ ...prev, [field]: [] }));
      } else {
        setFilters(prev => ({ ...prev, [field]: allOptions.map(opt => opt.name) }));
      }
      return;
    }
    handleMultiSelectChange(selected, { name: field });
  };

  const clearFilters = () => {
    const defaultPayGroup = filterOptions.payGroups.length > 0 ? filterOptions.payGroups[0].id : '';
    setFilters({
      payGroup: defaultPayGroup,
      payPeriods: [],
      designations: [],
      employees: [],
      projects: [],
      sections: [],
      companies: [],
      departments: [],
      employers: []
    });
    setReportData([]);
    setColumns([]);
    setError('');

    // Refresh options based on default pay group
    if (defaultPayGroup) {
      fetchFilterOptions({ payGroup: defaultPayGroup });
    }
  };

  const exportToExcel = () => {
    try {
      const exportData = [...reportData];
      if (totalRow) exportData.push(totalRow);
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Comparison Summary");
      XLSX.writeFile(wb, `Comparison_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      setShowExportOptions(false);
    } catch (err) {
      setError('Failed to export Excel');
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF('l', 'pt', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();

      if (companyName) {
        doc.setFontSize(16);
        doc.setTextColor(79, 70, 229);
        doc.setFont('helvetica', 'bold');
        doc.text(companyName.toUpperCase(), pageWidth / 2, 40, { align: 'center' });
      }

      doc.setFontSize(12);
      doc.setTextColor(51, 65, 85);
      doc.text('Advanced Multi-Period Comparison Report', pageWidth / 2, 60, { align: 'center' });

      const tableData = reportData.map(item =>
        columns.map(col => typeof item[col] === 'number'
          ? item[col].toLocaleString(undefined, { minimumFractionDigits: col.includes('Amount') ? 2 : 0 })
          : item[col] || '')
      );

      if (totalRow) {
        tableData.push(columns.map(col => typeof totalRow[col] === 'number'
          ? totalRow[col].toLocaleString(undefined, { minimumFractionDigits: 2 })
          : totalRow[col] || ''));
      }

      autoTable(doc, {
        head: [columns.map(col => col.toUpperCase())],
        body: tableData,
        startY: 90,
        styles: { fontSize: 7, cellPadding: 3 },
        headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255] },
        didParseCell: function (data) {
          if (data.section === 'body' && data.column.index > 0) {
            data.cell.styles.halign = 'right';
          }
          if (data.row.index === tableData.length - 1 && totalRow) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [241, 245, 249];
          }
        }
      });

      doc.save(`Comparison_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      setShowExportOptions(false);
    } catch (err) {
      setError('Failed to export PDF');
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
      fontSize: '0.75rem',
      minHeight: '38px',
      backgroundColor: 'white'
    }),
    option: (base, state) => ({
      ...base,
      fontSize: '0.75rem',
      backgroundColor: state.isFocused ? 'rgba(79, 70, 229, 0.05)' : 'white',
      color: 'var(--text-main)',
      padding: '4px 10px',
      cursor: 'pointer',
      '&:active': {
        backgroundColor: 'rgba(79, 70, 229, 0.1)'
      }
    }),
    menu: (base) => ({
      ...base,
      zIndex: 9999,
      borderRadius: '10px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      border: '1px solid var(--border-color)'
    }),
    menuList: (base) => ({
      ...base,
      padding: '4px'
    }),
    placeholder: (base) => ({
      ...base,
      color: '#94a3b8'
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: 'rgba(79, 70, 229, 0.1)',
      borderRadius: '6px'
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: 'var(--primary-color)',
      fontWeight: 500
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: 'var(--primary-color)',
      ':hover': {
        backgroundColor: 'var(--primary-color)',
        color: 'white',
        borderRadius: '0 6px 6px 0'
      }
    })
  };

  const renderDropdown = (field, label, options, isRequired = false) => (
    <div className="col-md-3">
      <label className="filter-label">{label} {isRequired && <span className="text-danger">*</span>}</label>
      <Select
        isMulti
        name={field}
        menuIsOpen={activeMenu === field}
        onMenuOpen={() => setActiveMenu(field)}
        onMenuClose={() => setActiveMenu(null)}
        options={getOptions(options.map(opt => ({ value: opt.name, label: opt.name })))}
        value={filters[field].map(val => ({ value: val, label: val }))}
        onChange={(selected) => handleSelectAll(selected, field, options)}
        placeholder={`Select ${label}`}
        styles={customSelectStyles}
        classNamePrefix="select"
        closeMenuOnSelect={false}
        hideSelectedOptions={false}
        components={{ Option, ValueContainer }}
      />
    </div>
  );

  return (
    <div className="premium-container">
      <div className="premium-header">
        <div>
          <h1 className="premium-title">Advanced Cost Comparison</h1>
          <p className="premium-subtitle">Multi-period cost analysis with advanced filtering across all dimensions</p>
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

      {error && <div className="alert alert-danger mb-3 py-2 small">{error}</div>}

      <div className="premium-card mb-4">
        <div className="row g-3">
          {renderDropdown('payPeriods', 'PAY PERIODS', filterOptions.payPeriods, true)}
          {renderDropdown('designations', 'DESIGNATIONS', filterOptions.designations)}
          {renderDropdown('employees', 'EMPLOYEES', filterOptions.employees)}
          {renderDropdown('projects', 'PROJECTS', filterOptions.projects)}
          {renderDropdown('sections', 'SECTIONS', filterOptions.sections)}
          {renderDropdown('companies', 'COMPANIES', filterOptions.companies)}
          {renderDropdown('departments', 'DEPARTMENTS', filterOptions.departments)}
          {renderDropdown('employers', 'EMPLOYERS', filterOptions.employers)}
        </div>
        <div className="mt-3 d-flex justify-content-end gap-2">
          <button
            type="button"
            className="btn-premium btn-premium-primary px-4 py-2"
            onClick={fetchReportData}
            disabled={loading || filters.payPeriods.length === 0}
            style={{ fontSize: '0.85rem' }}
          >
            {loading ? <><span className="spinner-border spinner-border-sm me-2"></span> Generating...</> : <><i className="fa fa-search"></i> <span>Generate Comparison</span></>}
          </button>
          <button
            type="button"
            className="btn-premium btn-premium-secondary px-4 py-2"
            onClick={clearFilters}
            disabled={loading}
            style={{ fontSize: '0.85rem' }}
          >
            <i className="fa fa-refresh"></i> <span>Clear Filters</span>
          </button>
        </div>
      </div>

      <div className="premium-card p-0 overflow-hidden shadow-sm">
        <div className="tab-content">
          {loading ? (
            <div className="loading-overlay py-5">
              <div className="spinner-premium"></div>
              <p className="mt-2 small">Crunching numbers...</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table-premium">
                <thead>
                  <tr>
                    {columns.map((col, idx) => (
                      <th key={idx} style={{ textAlign: idx === 0 ? 'left' : 'right' }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length || 1} className="text-center p-5 text-muted small">
                        Select periods and filters to begin analysis.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {reportData.map((row, idx) => (
                        <tr key={idx}>
                          {columns.map((col, colIdx) => (
                            <td key={colIdx} style={{ textAlign: colIdx === 0 ? 'left' : 'right' }}
                              className={colIdx === 0 ? 'designation-column' : col.includes('Amount') ? 'amount-column' : 'count-column'}>
                              {typeof row[col] === 'number'
                                ? row[col].toLocaleString(undefined, {
                                  minimumFractionDigits: col.includes('Amount') ? 2 : 0,
                                  maximumFractionDigits: col.includes('Amount') ? 2 : 0
                                })
                                : row[col]}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {totalRow && (
                        <tr className="total-row-premium">
                          {columns.map((col, idx) => (
                            <td key={idx} style={{ textAlign: idx === 0 ? 'left' : 'right' }} className={idx === 0 ? 'designation-column' : ''}>
                              {typeof totalRow[col] === 'number'
                                ? totalRow[col].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                : totalRow[col]}
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

export default CostAllocationMonthWithFilter;
