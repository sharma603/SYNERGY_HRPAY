import React, { useState, useEffect, useCallback } from 'react'; 
 import Select from 'react-select'; 
 import * as XLSX from 'xlsx'; 
 import jsPDF from 'jspdf'; 
 import autoTable from 'jspdf-autotable'; 
 import { costAllocationAPI, authAPI } from '../services/api'; 
 import '../PremiumTheme.css'; 
 
 function AttendanceRegister() { 
   const [reportData, setReportData] = useState([]); 
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
     company: '' 
   }); 
 
   const [masterData, setMasterData] = useState({ 
     departments: [], 
     designations: [], 
     employees: [], 
     locations: [], 
     sections: [], 
     companies: [] 
   }); 
 
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
         companies: data.companies || []
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
       const response = await costAllocationAPI.getAttendanceRegister({ 
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
     } catch (err) { 
       setError('Failed to fetch attendance register. Please check if the server is running.'); 
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
       fromDate: new Date().toISOString().split('T')[0], 
       toDate: new Date().toISOString().split('T')[0], 
       department: '', 
       designation: '', 
       location: '', 
       section: '', 
       empCode: '', 
       inout: '', 
       company: '' 
     }); 
   }; 
 
   const exportToExcel = async () => { 
     try { 
       setLoading(true); 
       const response = await costAllocationAPI.getAttendanceRegister({ 
         ...filters, 
         page: 1, 
         limit: 1000000 
       }); 
       const allData = response.data.reportData || []; 
       
       const excelData = allData.map(row => ({ 
         "FINGER ID": row.RAW_FINGERID, 
         "EMP CODE": row.RAW_EMPCODE, 
         "EMPLOYEE NAME": row.EMP_NAME, 
         "LOCATION": row.LOCATION_NAME || row.LOC_NAME || row.LOCATION || '-', 
         "DATE": row.DATE, 
         "CHECK IN": row.CHECK_IN || '-', 
         "CHECK OUT": row.CHECK_OUT || '-', 
         "DIRECTION": row.RAW_DIRECTION 
       })); 
 
       const ws = XLSX.utils.json_to_sheet(excelData); 
       const wb = XLSX.utils.book_new(); 
       XLSX.utils.book_append_sheet(wb, ws, "Attendance Register"); 
       XLSX.writeFile(wb, `Attendance_Register_${new Date().toISOString().split('T')[0]}.xlsx`); 
     } catch (err) { 
       console.error('Export to Excel failed:', err); 
     } finally { 
       setLoading(false); 
     } 
   }; 
 
   const exportToPDF = async () => { 
     try { 
       setLoading(true); 
       const response = await costAllocationAPI.getAttendanceRegister({ 
         ...filters, 
         page: 1, 
         limit: 1000000 
       }); 
       const allData = response.data.reportData || []; 
 
       const doc = jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }); 
       
       doc.setFontSize(16); 
       doc.text(footerInfo?.COM_NAME || "Attendance Register", 14, 15); 
       
       doc.setFontSize(10); 
       doc.setTextColor(100); 
       doc.text(`Period: ${filters.fromDate} to ${filters.toDate}`, 14, 22); 
       doc.text(`Printed By: ${footerInfo?.PRINTEDUSER || 'System'} | Date: ${footerInfo?.DATE || ''}`, 14, 27); 
 
       const tableColumn = ["FINGER ID", "EMP CODE", "EMPLOYEE NAME", "LOCATION", "DATE", "CHECK IN", "CHECK OUT", "DIRECTION"]; 
       const tableRows = allData.map(row => [ 
         row.RAW_FINGERID, 
         row.RAW_EMPCODE, 
         row.EMP_NAME, 
         row.LOCATION_NAME || row.LOC_NAME || row.LOCATION || '-', 
         row.DATE, 
         row.CHECK_IN || '-', 
         row.CHECK_OUT || '-', 
         row.RAW_DIRECTION 
       ]); 
 
       autoTable(doc, { 
         head: [tableColumn], 
         body: tableRows, 
         startY: 35, 
         theme: 'grid', 
         styles: { fontSize: 8 }, 
         headStyles: { fillColor: [79, 70, 229] } 
       }); 
 
       doc.save(`Attendance_Register_${new Date().toISOString().split('T')[0]}.pdf`); 
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
           <h1 className="premium-title">Attendance Register</h1> 
          
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
             <label className="form-label fw-bold small text-muted text-uppercase">From Date</label> 
             <input type="date" name="fromDate" value={filters.fromDate} onChange={handleFilterChange} className="form-control form-control-sm" placeholder="dd-mm-yyyy" /> 
             <div className="form-text text-muted mt-1" style={{ fontSize: '0.7rem' }}>You can type or use the picker</div> 
           </div> 
           <div className="col-md-4"> 
             <label className="form-label fw-bold small text-muted text-uppercase">To Date</label> 
             <input type="date" name="toDate" value={filters.toDate} onChange={handleFilterChange} className="form-control form-control-sm" placeholder="dd-mm-yyyy" /> 
             <div className="form-text text-muted mt-1" style={{ fontSize: '0.7rem' }}>You can type or use the picker</div> 
           </div> 
           <div className="col-md-4"> 
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
           <div className="col-md-4"> 
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
           <div className="col-md-4"> 
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
           <div className="col-md-4"> 
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
           <div className="col-md-4"> 
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
           <div className="col-md-8 d-flex align-items-end gap-2"> 
             <button onClick={handleSearch} className="btn-premium btn-premium-primary px-4" disabled={loading}> 
               {loading ? <span className="spinner-border spinner-border-sm"></span> : <><i className="fa fa-search"></i> Search</>} 
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
               <p className="text-muted">Fetching attendance logs...</p> 
             </div> 
           ) : reportData.length > 0 ? ( 
             <table className="table-premium"> 
               <thead> 
                 <tr> 
                   <th>FINGER ID</th> 
                   <th>EMP CODE</th> 
                   <th>EMPLOYEE NAME</th> 
                   <th>LOCATION</th> 
                   <th>DATE</th> 
                   <th>CHECK IN</th> 
                   <th>CHECK OUT</th> 
                   <th>DIRECTION</th> 
                 </tr> 
               </thead> 
               <tbody> 
                 {reportData.map((row, index) => ( 
                   <tr key={index}> 
                     <td>{row.RAW_FINGERID}</td> 
                     <td>{row.RAW_EMPCODE}</td> 
                     <td className="fw-bold">{row.EMP_NAME}</td> 
                     <td>{row.LOCATION_NAME || row.LOC_NAME || row.LOCATION || '-'}</td> 
                     <td>{row.DATE}</td> 
                     <td>{row.CHECK_IN || '-'}</td> 
                     <td>{row.CHECK_OUT || '-'}</td> 
                     <td> 
                       <span className={`badge-premium ${row.RAW_DIRECTION === 'IN' ? 'badge-premium-green' : 'badge-premium-red'}`}> 
                         {row.RAW_DIRECTION} 
                       </span> 
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
     </div> 
   ); 
 } 
 
 export default AttendanceRegister; 
