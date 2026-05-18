import React, { useState, useEffect, useCallback } from 'react'; 
 import Select from 'react-select'; 
 import * as XLSX from 'xlsx'; 
 import jsPDF from 'jspdf'; 
 import autoTable from 'jspdf-autotable'; 
 import { Modal, Button } from 'react-bootstrap';
 import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
 import { costAllocationAPI, authAPI } from '../services/api'; 
 import '../PremiumTheme.css';

function AttendanceRegisterAll() {
  const [reportData, setReportData] = useState([]);
  const [allFilteredData, setAllFilteredData] = useState([]); // For summary and exports
  const [footerInfo, setFooterInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  
  const [filters, setFilters] = useState({
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    department: '',
    designation: '',
    location: '',
    section: '',
    empCode: '', 
    inout: '', 
    company: '',
    status: '',
    lateOnly: false
  });

  const [masterData, setMasterData] = useState({
    departments: [],
    designations: [],
    employees: [],
    locations: [],
    sections: [],
    companies: [],
    attendanceStatuses: []
  });

  const [editingStatus, setEditingStatus] = useState(null); // Track which row is being edited {index, empCode, date}
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showAttendanceSummary, setShowAttendanceSummary] = useState(false);
  const [summaryType, setSummaryModalType] = useState('Absent'); // 'Absent' or 'Vacation'

  const formatLocation = (loc) => { 
    if (!loc || loc === '-') return '-'; 
    // Remove "Latitude: ..., Longitude: ... ||" part if it exists 
    if (loc.includes('||')) { 
      return loc.split('||')[1].trim(); 
    } 
    return loc; 
  }; 

  const fetchMasterData = async () => {
    try {
      const response = await authAPI.getMasterData();
      const data = response.data;
      setMasterData({
        departments: data.departments || [],
        designations: data.designations || [],
        employees: data.employees || [],
        locations: data.locations || [],
        sections: data.sections || [],
        companies: data.companies || [],
        attendanceStatuses: data.attendanceStatuses || []
      });
    } catch (err) {
      console.error('Error fetching master data:', err);
    }
  };

  const fetchReportData = useCallback(async (pageNumber = 1, limitOverride = null) => { 
     try { 
       setLoading(true); 
       setError(''); 
       const currentLimit = limitOverride || pagination.limit; 
       
       // 1. Fetch paginated data for the table
       const response = await costAllocationAPI.getAttendanceRegisterAll({ 
         ...filters, 
         page: pageNumber, 
         limit: currentLimit 
       }); 
       
       setReportData(response.data.reportData || []); 
       setFooterInfo(response.data.footerInfo || null); 
       if (response.data.pagination) { 
         setPagination(prev => ({ 
           ...prev, 
           ...response.data.pagination, 
           limit: currentLimit 
         })); 
       }

       // 2. Fetch ALL data for summary and exports (only if not already fetched or on search)
       if (pageNumber === 1 || allFilteredData.length === 0) {
         const allResponse = await costAllocationAPI.getAttendanceRegisterAll({ 
           ...filters, 
           page: 1, 
           limit: 1000000 // High limit to get all
         });
         setAllFilteredData(allResponse.data.reportData || []);
       }
     } catch (err) { 
       setError('Failed to fetch attendance register all. Please check if the server is running.'); 
       console.error(err); 
     } finally { 
       setLoading(false); 
     } 
   }, [filters, pagination.limit, allFilteredData.length]); 
 
   useEffect(() => { 
     fetchMasterData(); 
     fetchReportData(1); 
   }, []); 
 
   const handleSearch = () => {
    // Validate dates
    if (filters.fromDate && filters.toDate) {
      const from = new Date(filters.fromDate);
      const to = new Date(filters.toDate);
      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        alert('Please enter valid dates');
        return;
      }
      if (from > to) {
        alert('From Date cannot be later than To Date');
        return;
      }
    }
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
 
   const handleStatusUpdate = async (row, newStatus) => {
    try {
      setLoading(true);
      await costAllocationAPI.updateAttendanceStatus({
        empCode: row.RAW_EMPCODE,
        date: row.DATE,
        status: newStatus
      });
      // Refresh data after update
      fetchReportData(pagination.page);
      setEditingStatus(null);
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openSummaryModal = (type) => {
    setSummaryModalType(type);
    setShowSummaryModal(true);
  };

  const getFilteredSummaryData = () => {
    if (summaryType === 'Absent') {
      return allFilteredData.filter(row => row.STATUS === 'Absent');
    } else if (summaryType === 'Vacation') {
      return allFilteredData.filter(row => row.STATUS === 'Vacation' || row.STATUS === 'On Leave');
    } else if (summaryType === 'Late') {
      return allFilteredData.filter(row => {
        // 1. Check if late (After 08:20)
        const timeStr = String(row.TIME || '');
        const isLate = timeStr > '08:20';
        
        // 2. Check if it's an entry (IN)
        const dirStr = String(row.RAW_DIRECTION || row.DIRECTION || '').toUpperCase().trim();
        const isEntry = dirStr === 'IN';

        // 3. Check if status is Present
        const statusStr = String(row.STATUS || '').toUpperCase().trim();
        const isPresent = statusStr === 'PRESENT';

        // Note: We don't check row.SECTION here because the backend already filters 
        // by section if it was selected in the dropdown.
        return isLate && isEntry && isPresent;
      });
    }
    return [];
  };

  const getAttendanceChartData = () => {
    const summary = allFilteredData.reduce((acc, row) => {
      const status = row.STATUS || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return Object.keys(summary).map(key => ({
      name: key,
      value: summary[key]
    })).sort((a, b) => b.value - a.value);
  };

   const CHART_COLORS = {
    'Present': '#10b981', // Emerald
    'Absent': '#f43f5e',  // Rose
    'Vacation': '#3b82f6', // Blue
    'On Leave': '#8b5cf6', // Violet
    'Holiday': '#f59e0b',  // Amber
    'Unknown': '#94a3b8'   // Slate
  };

  const handleBreakdownClick = (statusName) => {
    if (statusName === 'Absent') {
      setShowAttendanceSummary(false);
      openSummaryModal('Absent');
    } else if (statusName === 'Vacation' || statusName === 'On Leave') {
      setShowAttendanceSummary(false);
      openSummaryModal('Vacation');
    }
  };

  const exportSummaryExcel = () => {
    const data = getFilteredSummaryData();
    const excelData = data.map((row, index) => ({
      "S/N": index + 1,
      "EMP CODE": row.RAW_EMPCODE,
      "EMPLOYEE NAME": row.EMP_NAME,
      "DESIGNATION": row.DESIGNATION_NAME || '-',
      "LOCATION": row.LOCATION_NAME || row.LOC_NAME || row.LOCATION || '-',
      "DATE": row.DATE,
      "TIME": row.TIME || '-',
      "DIRECTION": row.RAW_DIRECTION || '-',
      "LOCATION (MOB)": formatLocation(row.RAW_LOCATION_MOB),
      "STATUS": row.STATUS
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, summaryType);
    XLSX.writeFile(wb, `${summaryType}_List_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportSummaryPDF = () => {
    const data = getFilteredSummaryData();
    const doc = jsPDF({ orientation: 'landscape' });
    
    doc.setFontSize(16);
    doc.text(`${summaryType} List`, 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Period: ${filters.fromDate} to ${filters.toDate}`, 14, 22);

    const tableColumn = ["S/N", "EMP CODE", "EMPLOYEE NAME", "DESIGNATION", "LOCATION", "DATE", "TIME", "DIRECTION", "LOCATION (MOB)", "STATUS"];
    const tableRows = data.map((row, index) => [
      index + 1,
      row.RAW_EMPCODE,
      row.EMP_NAME,
      row.DESIGNATION_NAME || '-',
      row.LOCATION_NAME || row.LOC_NAME || row.LOCATION || '-',
      row.DATE,
      row.TIME || '-',
      row.RAW_DIRECTION || '-',
      formatLocation(row.RAW_LOCATION_MOB),
      row.STATUS
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 8 }
    });

    doc.save(`${summaryType}_List_${new Date().toISOString().split('T')[0]}.pdf`);
  };

   const getCurrentPageData = () => { 
     return reportData; 
   };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (selectedOption, { name }) => {
    setFilters(prev => ({
      ...prev,
      [name]: name === 'empCode' 
        ? (selectedOption ? selectedOption.map(opt => opt.value).join(',') : '')
        : (selectedOption ? selectedOption.value : '')
    }));
  };

  const clearFilters = () => {
    setFilters({
      fromDate: new Date().toISOString().split('T')[0],
      toDate: new Date().toISOString().split('T')[0],
      department: '',
      designation: '',
      location: '',
      section: '',
      empCode: '', 
      inout: '', 
      company: '',
      status: '',
      lateOnly: false
    });
    setTimeout(() => handleSearch(), 100);
  };

  const exportToExcel = () => {
    const excelData = allFilteredData.map((row, index) => ({
      "S/N": index + 1,
      "EMP CODE": row.RAW_EMPCODE,
      "EMPLOYEE NAME": row.EMP_NAME,
      "DESIGNATION": row.DESIGNATION_NAME || '-',
      "LOCATION": row.LOCATION_NAME || row.LOC_NAME || row.LOCATION || '-',
      "DATE": row.DATE,
      "TIME": row.TIME,
      "DIRECTION": row.RAW_DIRECTION,
      "LOCATION (MOB)": formatLocation(row.RAW_LOCATION_MOB),
      "STATUS": row.STATUS
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Register All");
    XLSX.writeFile(wb, `Attendance_Register_All_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = jsPDF({ orientation: 'landscape' });
    
    doc.setFontSize(16);
    doc.text(footerInfo?.COM_NAME || "Attendance Register All", 14, 15);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Period: ${filters.fromDate} to ${filters.toDate}`, 14, 22);
    doc.text(`Printed By: ${footerInfo?.PRINTEDUSER || 'System'} | Date: ${footerInfo?.DATE || ''}`, 14, 27);

    const tableColumn = ["S/N", "EMP CODE", "EMPLOYEE NAME", "DESIGNATION", "LOCATION", "DATE", "TIME", "DIRECTION", "LOCATION (MOB)", "STATUS"];
    const tableRows = allFilteredData.map((row, index) => [
      index + 1,
      row.RAW_EMPCODE,
      row.EMP_NAME,
      row.DESIGNATION_NAME || '-',
      row.LOCATION_NAME || row.LOC_NAME || row.LOCATION || '-',
      row.DATE,
      row.TIME,
      row.RAW_DIRECTION,
      formatLocation(row.RAW_LOCATION_MOB),
      row.STATUS
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`Attendance_Register_All_${new Date().toISOString().split('T')[0]}.pdf`);
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
// Handle late arrivals filter
  const handleLateArrivals = async () => {
    // 1. Ensure Section is set to STAFF A and status is Present
    if (filters.section !== 'STAFF A') {
      const newFilters = { ...filters, section: 'STAFF A' };
      setFilters(newFilters);
      
      // 2. Fetch fresh data for this section
      setLoading(true);
      try {
        const allResponse = await costAllocationAPI.getAttendanceRegisterAll({ 
          ...newFilters, 
          page: 1, 
          limit: 1000000 
        });
        setAllFilteredData(allResponse.data.reportData || []);
      } catch (err) {
        console.error('Error fetching late arrivals:', err);
      } finally {
        setLoading(false);
      }
    }
    
    // 3. Open the modal
    setSummaryModalType('Late');
    setShowSummaryModal(true);
  };

  return (
    <div className="premium-container">
      <div className="premium-header">
        <div>
          <h1 className="premium-title">Attendance Register All</h1>
          <p className="premium-subtitle">Full attendance logs with advanced filtering</p>
        </div>
        <div className="d-flex gap-2"> 
           <button onClick={() => setShowAttendanceSummary(true)} className="btn-premium btn-premium-dark" disabled={reportData.length === 0}>
             <i className="fa fa-pie-chart"></i> <span>Attendance Summary</span>
           </button>
           <button onClick={() => openSummaryModal('Absent')} className="btn-premium btn-premium-secondary" disabled={reportData.length === 0}>
             <i className="fa fa-user-times text-danger"></i> <span>Absent List</span>
           </button>
           <button onClick={() => openSummaryModal('Vacation')} className="btn-premium btn-premium-secondary" disabled={reportData.length === 0}>
             <i className="fa fa-plane text-dark"></i> <span>Vacation List</span>
           </button>
           <button 
             onClick={handleLateArrivals} 
             className={`btn-premium ${filters.lateOnly ? 'btn-premium-dark' : 'btn-premium-secondary'}`} 
             disabled={reportData.length === 0}
           >
             <i className="fa fa-clock-o text-dark"></i> <span>Late Arrivals (STAFF A)</span>
           </button>
           <button onClick={exportToExcel} className="btn-premium btn-premium-secondary" disabled={reportData.length === 0}>
            <i className="fa fa-file-excel-o text-dark"></i> <span>Excel</span>
          </button>
          <button onClick={exportToPDF} className="btn-premium btn-premium-secondary" disabled={reportData.length === 0}>
            <i className="fa fa-file-pdf-o text-dark"></i> <span>PDF</span>
          </button>
        </div>
      </div>

      <div className="premium-card">
        <div className="row g-3">
          <div className="col-md-3">
            <label className="form-label fw-bold small text-muted text-uppercase">From Date</label>
            <input type="date" name="fromDate" value={filters.fromDate} onChange={handleFilterChange} className="form-control form-control-sm" />
          </div>
          <div className="col-md-3">
            <label className="form-label fw-bold small text-muted text-uppercase">To Date</label>
            <input type="date" name="toDate" value={filters.toDate} onChange={handleFilterChange} className="form-control form-control-sm" />
          </div>
          <div className="col-md-3">
            <label className="form-label fw-bold small text-muted text-uppercase">Department</label>
            <Select
              name="department"
              value={masterData.departments?.find(d => d.id === filters.department) ? { value: filters.department, label: masterData.departments.find(d => d.id === filters.department).name } : null}
              onChange={handleSelectChange}
              options={masterData.departments?.map(d => ({ value: d.id, label: d.name })) || []}
              placeholder="All Departments"
              styles={customSelectStyles}
              isClearable
            />
          </div>
          <div className="col-md-3">
            <label className="form-label fw-bold small text-muted text-uppercase">Designation</label>
            <Select
              name="designation"
              value={masterData.designations?.find(d => d.name === filters.designation) ? { value: filters.designation, label: filters.designation } : null}
              onChange={handleSelectChange}
              options={masterData.designations?.map(d => ({ value: d.name, label: d.name })) || []}
              placeholder="All Designations"
              styles={customSelectStyles}
              isClearable
            />
          </div>
          <div className="col-md-3">
            <label className="form-label fw-bold small text-muted text-uppercase">Location</label>
            <Select
              name="location"
              value={masterData.locations?.find(l => l.id === filters.location) ? { value: filters.location, label: masterData.locations.find(l => l.id === filters.location).name } : null}
              onChange={handleSelectChange}
              options={masterData.locations?.map(l => ({ value: l.id, label: l.name })) || []}
              placeholder="All Locations"
              styles={customSelectStyles}
              isClearable
            />
          </div>
          <div className="col-md-3">
            <label className="form-label fw-bold small text-muted text-uppercase">Section</label>
            <Select
              name="section"
              value={masterData.sections?.find(s => s.name === filters.section) ? { value: filters.section, label: filters.section } : null}
              onChange={handleSelectChange}
              options={masterData.sections?.map(s => ({ value: s.name, label: s.name })) || []}
              placeholder="All Sections"
              styles={customSelectStyles}
              isClearable
            />
          </div>
          <div className="col-md-3">
            <label className="form-label fw-bold small text-muted text-uppercase">Direction</label>
            <Select
              name="inout"
              value={filters.inout ? { value: filters.inout, label: filters.inout } : null}
              onChange={handleSelectChange}
              options={[
                { value: 'IN', label: 'IN' },
                { value: 'OUT', label: 'OUT' }
              ]}
              placeholder="Both"
              styles={customSelectStyles}
              isClearable
            />
          </div>
          <div className="col-md-3">
            <label className="form-label fw-bold small text-muted text-uppercase">Status</label>
            <Select
              name="status"
              value={filters.status ? { value: filters.status, label: filters.status } : null}
              onChange={handleSelectChange}
              options={masterData.attendanceStatuses?.map(s => ({ value: s.name, label: s.name })) || []}
              placeholder="All Status"
              styles={customSelectStyles}
              isClearable
            />
          </div>
          <div className="col-md-3">
            <label className="form-label fw-bold small text-muted text-uppercase">Employee</label>
            <Select
              isMulti
              name="empCode"
              value={filters.empCode ? filters.empCode.split(',').map(val => {
                const emp = masterData.employees?.find(e => e.id.toString() === val.toString());
                return emp ? { value: emp.id, label: `${emp.name} (${emp.code})` } : null;
              }).filter(Boolean) : []}
              onChange={(opt) => handleSelectChange(opt, { name: 'empCode' })}
              options={masterData.employees?.map(e => ({ value: e.id, label: `${e.name} (${e.code})` })) || []}
              placeholder="Select Employees..."
              styles={customSelectStyles}
              isClearable
            />
          </div>
          <div className="col-md-3 d-flex align-items-end gap-2">
            <button onClick={handleSearch} className="btn-premium btn-premium-dark px-4" disabled={loading}>
              {loading ? <span className="spinner-border spinner-border-sm"></span> : <><i className="fa fa-search"></i> Search</>}
            </button>
            <button onClick={clearFilters} className="btn-premium btn-premium-secondary px-4">
              Clear
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
              <p className="text-muted">Fetching attendance logs...</p>
            </div>
          ) : reportData.length > 0 ? (
            <table className="table-premium">
              <thead>
                <tr>
                  <th>S/N</th>
                  <th>EMP CODE</th>
                  <th>EMPLOYEE NAME</th>
                  <th>DESIGNATION</th>
                  <th>LOCATION</th>
                  <th>DATE</th>
                  <th>TIME</th>
                  <th>DIRECTION</th>
                  <th>LOCATION (MOB)</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {getCurrentPageData().map((row, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{row.RAW_EMPCODE}</td>
                    <td className="fw-bold">{row.EMP_NAME}</td>
                    <td>{row.DESIGNATION_NAME || '-'}</td>
                    <td>{row.LOCATION_NAME || row.LOC_NAME || row.LOCATION || '-'}</td>
                    <td>{row.DATE}</td>
                    <td>{row.TIME}</td>
                    <td>
                      <span className={`badge-premium ${row.RAW_DIRECTION === 'IN' ? 'badge-premium-green' : 'badge-premium-red'}`}>
                        {row.RAW_DIRECTION}
                      </span>
                    </td>
                    <td className="small text-muted">{formatLocation(row.RAW_LOCATION_MOB)}</td>
                    <td className="fw-bold">
                      {editingStatus === `${row.RAW_EMPCODE}_${row.DATE}` ? (
                        <Select
                          options={masterData.attendanceStatuses?.map(s => ({ value: s.name, label: s.name })) || []}
                          onChange={(opt) => handleStatusUpdate(row, opt.value)}
                          onBlur={() => setEditingStatus(null)}
                          autoFocus
                          menuPortalTarget={document.body}
                          styles={{
                            ...customSelectStyles,
                            container: (base) => ({ ...base, minWidth: '120px' })
                          }}
                        />
                      ) : (
                        <span 
                          onClick={() => setEditingStatus(`${row.RAW_EMPCODE}_${row.DATE}`)}
                          style={{ cursor: 'pointer', borderBottom: '1px dashed #ccc' }}
                          title="Click to change status"
                        >
                          {row.STATUS}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-5 text-center">
              <i className="fa fa-calendar-o fa-3x text-muted mb-3"></i>
              <p className="text-muted">No attendance logs found.</p>
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

       {/* Summary Modal for Absent/Vacation */}
       <Modal show={showSummaryModal} onHide={() => setShowSummaryModal(false)} size="xl" centered scrollable className="premium-modal">
         <Modal.Header closeButton className="border-0 px-4 pt-4 pb-0">
           <Modal.Title className="fw-bold d-flex align-items-center justify-content-between w-100 me-3 text-dark">
             <div className="d-flex align-items-center">
               <div className="icon-box-sm bg-dark text-white me-3 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', borderRadius: '8px' }}>
                 <i className={`fa ${summaryType === 'Late' ? 'fa-clock-o' : summaryType === 'Absent' ? 'fa-user-times' : 'fa-plane'}`}></i>
               </div>
               <span>
                 {summaryType === 'Absent' ? 'Absent Employees List' : 
                  summaryType === 'Vacation' ? 'Vacation List' : 
                  'Late Arrivals List (STAFF A)'}
               </span>
             </div>
             <span className="badge bg-dark px-3 py-2" style={{ fontSize: '0.8rem' }}>
               {getFilteredSummaryData().length} Records
             </span>
           </Modal.Title>
         </Modal.Header>
         <Modal.Body className="px-0 py-4">
           <div className="table-responsive">
             <table className="table-premium mb-0">
               <thead>
                 <tr>
                   <th>S/N</th>
                   <th>EMP CODE</th>
                   <th>EMPLOYEE NAME</th>
                   <th>DESIGNATION</th>
                   <th>LOCATION</th>
                   <th>DATE</th>
                   <th>TIME</th>
                   <th>DIRECTION</th>
                   <th>LOCATION (MOB)</th>
                   <th>STATUS</th>
                 </tr>
               </thead>
               <tbody>
                 {getFilteredSummaryData().length > 0 ? (
                   getFilteredSummaryData().map((row, idx) => (
                     <tr key={idx}>
                       <td>{idx + 1}</td>
                       <td>{row.RAW_EMPCODE}</td>
                       <td className="fw-bold">{row.EMP_NAME}</td>
                       <td>{row.DESIGNATION_NAME || '-'}</td>
                       <td>{row.LOCATION_NAME || row.LOC_NAME || row.LOCATION || '-'}</td>
                       <td>{row.DATE}</td>
                       <td>{row.TIME || '-'}</td>
                       <td>
                         <span className={`badge-premium ${row.RAW_DIRECTION === 'IN' ? 'badge-premium-green' : 'badge-premium-red'}`}>
                           {row.RAW_DIRECTION || '-'}
                         </span>
                       </td>
                       <td className="small text-muted">{formatLocation(row.RAW_LOCATION_MOB)}</td>
                       <td className="fw-bold">
                         <span className={`badge-premium ${row.STATUS === 'Present' ? 'badge-premium-green' : row.STATUS === 'Absent' ? 'badge-premium-red' : 'badge-premium-blue'}`}>
                           {row.STATUS}
                         </span>
                       </td>
                     </tr>
                   ))
                 ) : (
                   <tr>
                     <td colSpan="8" className="text-center py-5 text-muted">
                       <i className="fa fa-info-circle fa-2x mb-2 d-block opacity-25"></i>
                       No {summaryType.toLowerCase()} records found for the current filter.
                     </td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
         </Modal.Body>
         <Modal.Footer className="border-0 px-4 pt-0 pb-4">
           <div className="me-auto d-flex gap-2">
             <button className="btn-premium btn-premium-secondary btn-sm" onClick={exportSummaryExcel}>
               <i className="fa fa-file-excel-o text-dark"></i> Excel
             </button>
             <button className="btn-premium btn-premium-secondary btn-sm" onClick={exportSummaryPDF}>
               <i className="fa fa-file-pdf-o text-dark"></i> PDF
             </button>
           </div>
           <button className="btn-premium btn-premium-dark px-4" onClick={() => setShowSummaryModal(false)}>
             Close
           </button>
         </Modal.Footer>
       </Modal>

       {/* Attendance Summary Modal with Pie Chart */}
       <Modal show={showAttendanceSummary} onHide={() => setShowAttendanceSummary(false)} size="lg" centered className="premium-modal">
         <Modal.Header closeButton className="border-0 px-4 pt-4 pb-0">
           <Modal.Title className="fw-bold d-flex align-items-center text-dark">
             <div className="icon-box-sm bg-dark text-white me-3 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', borderRadius: '8px' }}>
               <i className="fa fa-pie-chart"></i>
             </div>
             Attendance Summary Report
           </Modal.Title>
         </Modal.Header>
         <Modal.Body className="p-4">
           <div className="row align-items-center">
             <div className="col-md-7">
               <div style={{ width: '100%', height: 400 }}>
                 <ResponsiveContainer>
                   <PieChart>
                     <Pie
                       data={getAttendanceChartData()}
                       cx="50%"
                       cy="50%"
                       innerRadius={80}
                       outerRadius={130}
                       paddingAngle={5}
                       cornerRadius={6}
                       dataKey="value"
                       label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                     >
                       {getAttendanceChartData().map((entry, index) => (
                         <Cell 
                           key={`cell-${index}`} 
                           fill={CHART_COLORS[entry.name] || CHART_COLORS['Unknown']}
                           stroke="none"
                         />
                       ))}
                     </Pie>
                     <Tooltip 
                       contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                       itemStyle={{ fontWeight: 'bold' }}
                     />
                     <Legend 
                       verticalAlign="bottom" 
                       height={36}
                       iconType="circle"
                       wrapperStyle={{ paddingTop: '20px' }}
                     />
                   </PieChart>
                 </ResponsiveContainer>
               </div>
             </div>
             <div className="col-md-5">
               <div className="premium-card bg-white shadow-sm border-0" style={{ borderRadius: '15px', backgroundColor: '#f8fafc' }}>
                 <div className="p-3">
                   <h5 className="mb-4 fw-bold text-dark">Status Breakdown</h5>
                   <div className="d-flex flex-column gap-3">
                     {getAttendanceChartData().map((item, idx) => {
                       const isClickable = item.name === 'Absent' || item.name === 'Vacation' || item.name === 'On Leave';
                       return (
                         <div 
                           key={idx} 
                           className={`d-flex justify-content-between align-items-center pb-2 border-bottom border-light ${isClickable ? 'status-row-clickable' : ''}`}
                           onClick={() => isClickable && handleBreakdownClick(item.name)}
                           style={{ cursor: isClickable ? 'pointer' : 'default' }}
                         >
                           <div className="d-flex align-items-center gap-3">
                             <div style={{ width: 14, height: 14, borderRadius: '4px', backgroundColor: CHART_COLORS[item.name] || CHART_COLORS['Unknown'], boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}></div>
                             <span className={`fw-semibold ${isClickable ? 'text-dark fw-bold' : 'text-muted'}`}>{item.name}</span>
                           </div>
                           <div className="d-flex align-items-center gap-2">
                             <span className="badge px-3 py-2 bg-dark text-white" style={{ borderRadius: '8px', fontSize: '0.85rem' }}>
                               {item.value}
                             </span>
                           </div>
                         </div>
                       );
                     })}
                     <div className="d-flex justify-content-between align-items-center pt-3 mt-2">
                       <span className="fw-bold text-muted">Total Records</span>
                       <span className="badge px-3 py-2 bg-dark text-white" style={{ borderRadius: '8px', fontSize: '0.9rem' }}>
                         {allFilteredData.length}
                       </span>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           </div>
         </Modal.Body>
         <Modal.Footer className="border-0 px-4 pt-0 pb-4">
           <button className="btn-premium btn-premium-dark px-5" onClick={() => setShowAttendanceSummary(false)}>
             Close
           </button>
         </Modal.Footer>
       </Modal>
     </div> 
   ); 
 }

export default AttendanceRegisterAll;
