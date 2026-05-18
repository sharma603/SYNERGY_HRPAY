import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Select, { components } from 'react-select';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { costAllocationAPI } from '../services/api'; 
import '../PremiumTheme.css';
import './CostAllocationMonth.css';
// this
function CostAllocationMonth() {
  const [reportData, setReportData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [totalRow, setTotalRow] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);

  const [filters, setFilters] = useState({
    payPeriods: [], // Array of selected names
    designations: [] // Array of selected names
  });

  const [filterOptions, setFilterOptions] = useState({
    payPeriods: [],
    designations: []
  });

  const fetchFilterOptions = useCallback(async () => {
    try {
      // Use mode 1 and 2 to get initial options
      const pgResponse = await costAllocationAPI.getReport({ mode: 1 });
      const payGroups = pgResponse.data.filters.payGroups;
      
      if (payGroups && payGroups.length > 0) {
        // Get periods for the first group by default to populate options
        const ppResponse = await costAllocationAPI.getReport({ mode: 2, payGroup: payGroups[0].id });
        setFilterOptions({
          payPeriods: ppResponse.data.filters.payPeriods || [],
          designations: ppResponse.data.filters.designations || []
        });
      }
    } catch (err) {
      console.error('Failed to fetch filter options:', err);
    }
  }, []);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  const fetchReportData = async () => {
    if (filters.payPeriods.length === 0) {
      setError('Please select at least one Pay Period');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await costAllocationAPI.synDesignationMultiPeriodSummary({
        payPeriods: filters.payPeriods.join(','),
        designations: filters.designations.join(',')
      });

      const data = response.data.reportData || [];
      const cols = response.data.columns || [];
      setReportData(data);
      setColumns(cols);
      setCompanyName(response.data.companyName || '');

      // Calculate totals
      if (data.length > 0 && cols.length > 0) {
        const totals = {};
        cols.forEach((col, idx) => {
          if (idx === 0) {
            totals[col] = 'TOTAL AMOUNT';
          } else if (col.includes('Amount')) {
            totals[col] = data.reduce((sum, row) => sum + (Number(row[col]) || 0), 0);
          } else {
            totals[col] = ''; // No sum for Count columns
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
            style={{ cursor: 'pointer', flexShrink: 0 }}
          />
          <span style={{ 
            fontSize: '0.8125rem', 
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

    if (selectedCount > 3) {
      return (
        <components.ValueContainer {...props}>
          <div style={{ padding: '2px 8px', fontWeight: 600, color: 'var(--primary-color)' }}>
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
    setFilters({ payPeriods: [], designations: [] });
    setReportData([]);
    setColumns([]);
    setError('');
  };

  const exportToExcel = () => {
    try {
      const exportData = [...reportData];
      if (totalRow) {
        exportData.push(totalRow);
      }
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Designation Summary");
      XLSX.writeFile(wb, `Designation_Summary_${new Date().toISOString().split('T')[0]}.xlsx`);
      setShowExportOptions(false);
    } catch (err) {
      setError('Failed to export Excel');
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF('l', 'pt', 'a4'); // Landscape orientation
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Add Company Name
      if (companyName) {
        doc.setFontSize(16);
        doc.setTextColor(79, 70, 229); // Primary color
        doc.setFont('helvetica', 'bold');
        doc.text(companyName.toUpperCase(), pageWidth / 2, 40, { align: 'center' });
      }
      
      // Add Report Title
      doc.setFontSize(12);
      doc.setTextColor(51, 65, 85); // Slate 700
      doc.setFont('helvetica', 'normal');
      doc.text('Cost Allocation Monthly Report - Designation Summary', pageWidth / 2, 60, { align: 'center' });
      
      // Add Selection Info
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // Slate 500
      const periodsText = `Periods: ${filters.payPeriods.join(', ')}`;
      doc.text(periodsText, 40, 85);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth - 40, 85, { align: 'right' });

      // Prepare Table Data
      const tableData = reportData.map(item => 
        columns.map(col => {
          const val = item[col];
          if (typeof val === 'number') {
            return val.toLocaleString(undefined, { 
              minimumFractionDigits: col.includes('Amount') ? 2 : 0,
              maximumFractionDigits: col.includes('Amount') ? 2 : 0 
            });
          }
          return val || '';
        })
      );

      // Add Total Row to PDF
      if (totalRow) {
        tableData.push(columns.map(col => {
          const val = totalRow[col];
          if (typeof val === 'number') {
            return val.toLocaleString(undefined, { 
              minimumFractionDigits: col.includes('Amount') ? 2 : 0,
              maximumFractionDigits: col.includes('Amount') ? 2 : 0 
            });
          }
          return val || '';
        }));
      }

      autoTable(doc, {
        head: [columns.map(col => col.toUpperCase())],
        body: tableData,
        startY: 100,
        margin: { left: 40, right: 40 },
        styles: { 
          fontSize: 8, 
          cellPadding: 5,
          valign: 'middle',
          font: 'helvetica'
        },
        headStyles: { 
          fillColor: [44, 62, 80], // Dark Slate
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { fontStyle: 'bold', halign: 'left', cellWidth: 'auto' } // Designation column
        },
        didParseCell: function(data) {
          // Align numeric columns to right
          if (data.section === 'body' && data.column.index > 0) {
            data.cell.styles.halign = 'right';
            
            // Highlight Amount columns with subtle background
            const colName = columns[data.column.index];
            if (colName && colName.includes('Amount')) {
              data.cell.styles.fillColor = [248, 250, 252];
              data.cell.styles.fontStyle = 'bold';
            }
          }

          // Style the total row specifically in PDF
          if (data.section === 'body' && data.row.index === tableData.length - 1 && totalRow) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [241, 245, 249];
            data.cell.styles.textColor = [15, 23, 42];
          }
        },
        alternateRowStyles: { 
          fillColor: [249, 250, 251] 
        },
        tableLineColor: [226, 232, 240],
        tableLineWidth: 0.1,
      });

      // Add Footer with Page Numbers
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Page ${i} of ${totalPages} |`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 20,
          { align: 'center' }
        );
      }

      doc.save(`${companyName || 'Report'}_Monthly_Cost_Allocation_${new Date().toISOString().split('T')[0]}.pdf`);
      setShowExportOptions(false);
    } catch (err) {
      console.error('PDF Export Error:', err);
      setError('Failed to export professional PDF');
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
      minHeight: '42px',
      backgroundColor: 'white'
    }),
    option: (base, state) => ({
      ...base,
      fontSize: '0.8125rem',
      backgroundColor: state.isFocused ? 'rgba(79, 70, 229, 0.05)' : 'white',
      color: 'var(--text-main)',
      padding: '4px 12px',
      cursor: 'pointer',
      '&:active': {
        backgroundColor: 'rgba(79, 70, 229, 0.1)'
      }
    }),
    menu: (base) => ({
      ...base,
      zIndex: 9999,
      borderRadius: '12px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
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
    singleValue: (base) => ({
      ...base,
      color: 'var(--text-main)'
    })
  };

  return (
    <div className="premium-container">
      <div className="premium-header">
        <div>
          {companyName && <h5 className="company-name-badge mb-1">{companyName}</h5>}
          <h1 className="premium-title">Cost Allocation Monthly Report</h1>
          <p className="premium-subtitle">Monthly designation-based cost comparison and summary</p>
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

      <div className="premium-card">
        <div className="row g-4">
          <div className="col-md-6">
            <label className="filter-label">PAY PERIODS <span className="text-danger">*</span></label>
            <Select
              isMulti
              name="payPeriods"
              menuIsOpen={activeMenu === 'payPeriods'}
              onMenuOpen={() => setActiveMenu('payPeriods')}
              onMenuClose={() => setActiveMenu(null)}
              options={getOptions(filterOptions.payPeriods.map(opt => ({ value: opt.name, label: opt.name })))}
              value={filters.payPeriods.map(val => ({ value: val, label: val }))}
              onChange={(selected) => handleSelectAll(selected, 'payPeriods', filterOptions.payPeriods)}
              placeholder="Select Pay Periods"
              styles={customSelectStyles}
              classNamePrefix="select"
              closeMenuOnSelect={false}
              hideSelectedOptions={false}
              components={{ Option, ValueContainer }}
            />
          </div>
          <div className="col-md-6">
            <label className="filter-label">DESIGNATIONS</label>
            <Select
              isMulti
              name="designations"
              menuIsOpen={activeMenu === 'designations'}
              onMenuOpen={() => setActiveMenu('designations')}
              onMenuClose={() => setActiveMenu(null)}
              options={getOptions(filterOptions.designations.map(opt => ({ value: opt.name, label: opt.name })))}
              value={filters.designations.map(val => ({ value: val, label: val }))}
              onChange={(selected) => handleSelectAll(selected, 'designations', filterOptions.designations)}
              placeholder="All Designations"
              styles={customSelectStyles}
              classNamePrefix="select"
              closeMenuOnSelect={false}
              hideSelectedOptions={false}
              components={{ Option, ValueContainer }}
            />
          </div>
        </div>
        <div className="mt-4 d-flex justify-content-end gap-2">
          <button 
            className="btn-premium btn-premium-primary px-4" 
            onClick={fetchReportData} 
            disabled={loading || filters.payPeriods.length === 0}
          >
            {loading ? (
              <><span className="spinner-border spinner-border-sm me-2"></span>Processing...</>
            ) : (
              <><i className="fa fa-search"></i> Generate Comparison</>
            )}
          </button>
          <button 
            className="btn-premium btn-premium-secondary px-5" 
            onClick={clearFilters}
          >
            <i className="fa fa-refresh"></i> Clear Filters
          </button>
        </div>
      </div>

      <div className="premium-card p-0 overflow-hidden mt-4 shadow-sm">
        <div className="tab-content">
          {loading ? (
            <div className="loading-overlay py-5">
              <div className="spinner-premium"></div>
              <p className="mt-3">Analyzing multi-period data...</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table-premium">
                <thead>
                  <tr>
                    {columns.map((col, idx) => (
                      <th 
                        key={idx} 
                        style={{ textAlign: idx === 0 ? 'left' : 'right' }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                    {reportData.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length || 1} className="text-center p-5">
                          <div className="empty-state">
                            <span className="empty-state-icon" style={{ fontSize: '3rem' }}>📈</span>
                            <h4 className="mt-3">No Data Selected</h4>
                            <p className="text-muted">Choose at least one pay period to compare results.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <>
                        {reportData.map((row, idx) => (
                          <tr key={idx}>
                            {columns.map((col, colIdx) => (
                              <td key={colIdx} style={{ 
                                textAlign: colIdx === 0 ? 'left' : 'right'
                              }}
                              className={colIdx === 0 ? 'designation-column' : col.includes('Amount') ? 'amount-column' : col.includes('Count') ? 'count-column' : ''}
                              >
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
                              <td key={idx} style={{ 
                                textAlign: idx === 0 ? 'left' : 'right',
                                fontWeight: 800,
                                fontSize: '0.75rem',
                                color: '#0f172a'
                              }}
                              className={idx === 0 ? 'designation-column' : ''}
                              >
                                {typeof totalRow[col] === 'number' 
                                  ? totalRow[col].toLocaleString(undefined, { 
                                      minimumFractionDigits: col.includes('Amount') ? 2 : 0,
                                      maximumFractionDigits: col.includes('Amount') ? 2 : 0
                                    })
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

export default CostAllocationMonth;
