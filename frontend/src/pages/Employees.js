import React, { useState, useEffect } from 'react';
import { Spinner, Alert, Form, Dropdown, ButtonGroup, Modal, Row, Col, Button } from 'react-bootstrap';
import { employeeAPI, authAPI } from '../services/api';
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
  { key: 'ACTIONS', label: 'ACTIONS' },
];

const DEFAULT_COLUMNS = ['EMP_Slno', 'EMP_IMAGE', 'EMP_Code', 'EMP_Name', 'EMP_LOC_DR', 'EMP_DEPT_DR', 'EMP_DESIG_DR', 'EMP_JOIN_DATE', 'ACTIONS'];

function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Master Data State
  const [masterData, setMasterData] = useState({
    departments: [],
    designations: [],
    locations: [],
    sections: [],
    companies: [],
    projects: []
  });

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    EMP_Code: '',
    EMP_Name: '',
    EMP_LOC_DR: '',
    EMP_DEPT_DR: '',
    EMP_DESIG_DR: '',
    EMP_DOB: '',
    EMP_NATION_DR: '',
    EMP_RELIGION_DR: '',
    EMP_PREV_ID: '',
    EMP_JOIN_DATE: '',
    EMP_ADDRESS: '',
    EMP_LAB_NO: '',
    EMP_MOL_NO: '',
    EMP_OT_DR: '',
    EMP_BANK_DR: '',
    EMP_BRANCH: '',
    EMP_AC_NO: '',
    EMP_SWIFT_CODE: '',
    EMP_UNIQ_CODE: ''
  });

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
    fetchMasterData();
  }, [currentPage, pageSize]);

  const fetchMasterData = async () => {
    try {
      const response = await authAPI.getMasterData();
      setMasterData(response.data);
    } catch (err) {
      console.error('Error fetching master data:', err);
    }
  };

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

  const handleCreateNew = () => {
    setEditMode(false);
    setSelectedFile(null);
    setImagePreview(null);
    setFormData({
      EMP_Code: '',
      EMP_Name: '',
      EMP_LOC_DR: '',
      EMP_DEPT_DR: '',
      EMP_DESIG_DR: '',
      EMP_DOB: '',
      EMP_NATION_DR: '',
      EMP_RELIGION_DR: '',
      EMP_PREV_ID: '',
      EMP_JOIN_DATE: '',
      EMP_ADDRESS: '',
      EMP_LAB_NO: '',
      EMP_MOL_NO: '',
      EMP_OT_DR: '',
      EMP_BANK_DR: '',
      EMP_BRANCH: '',
      EMP_AC_NO: '',
      EMP_SWIFT_CODE: '',
      EMP_UNIQ_CODE: ''
    });
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = (emp) => {
    setEditMode(true);
    setSelectedFile(null);
    setImagePreview(emp.EMP_IMAGE ? `data:image/jpeg;base64,${emp.EMP_IMAGE}` : null);
    // Map backend date strings to YYYY-MM-DD for input[type="date"]
    const formatDateForInput = (dateStr) => {
      if (!dateStr) return '';
      return new Date(dateStr).toISOString().split('T')[0];
    };

    setFormData({
      EMP_Code: emp.EMP_Code || '',
      EMP_Name: emp.EMP_Name || '',
      EMP_LOC_DR: emp.EMP_LOC_DR_ID || '', // We need the ID here
      EMP_DEPT_DR: emp.EMP_DEPT_DR_ID || '', 
      EMP_DESIG_DR: emp.EMP_DESIG_DR_ID || '',
      EMP_DOB: formatDateForInput(emp.EMP_DOB),
      EMP_NATION_DR: emp.EMP_NATION_DR_ID || '',
      EMP_RELIGION_DR: emp.EMP_RELIGION_DR_ID || '',
      EMP_PREV_ID: emp.EMP_PREV_ID || '',
      EMP_JOIN_DATE: formatDateForInput(emp.EMP_JOIN_DATE),
      EMP_ADDRESS: emp.EMP_ADDRESS || '',
      EMP_LAB_NO: emp.EMP_LAB_NO || '',
      EMP_MOL_NO: emp.EMP_MOL_NO || '',
      EMP_OT_DR: emp.EMP_OT_DR || '',
      EMP_BANK_DR: emp.EMP_BANK_DR_ID || '',
      EMP_BRANCH: emp.EMP_BRANCH || '',
      EMP_AC_NO: emp.EMP_AC_NO || '',
      EMP_SWIFT_CODE: emp.EMP_SWIFT_CODE || '',
      EMP_UNIQ_CODE: emp.EMP_UNIQ_CODE || '',
      EMP_Slno: emp.EMP_Slno
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to deactivate this employee?')) {
      try {
        await employeeAPI.delete(id);
        alert('Employee deactivated successfully');
        fetchEmployees(currentPage, pageSize, searchTerm);
      } catch (err) {
        alert('Failed to deactivate employee');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== undefined) {
          data.append(key, formData[key]);
        }
      });
      if (selectedFile) {
        data.append('image', selectedFile);
      }

      if (editMode) {
        await employeeAPI.update(formData.EMP_Slno, data);
        alert('Employee updated successfully!');
      } else {
        await employeeAPI.create(data);
        alert('Employee created successfully!');
      }
      setShowModal(false);
      fetchEmployees(currentPage, pageSize, searchTerm);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to process request');
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
      ALL_COLUMNS
        .filter(col => visibleColumns.includes(col.key) && col.key !== 'ACTIONS')
        .forEach(col => {
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
          <button className="btn-premium btn-premium-primary" onClick={handleCreateNew}>
            <i className="fa fa-user-plus me-1"></i> Add Employee
          </button>
          
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
                              : col.key === 'ACTIONS' ? (
                                <div className="d-flex gap-2">
                                  <button className="btn-premium btn-premium-secondary btn-sm p-2" onClick={() => handleEdit(emp)} title="Edit">
                                    <i className="fa fa-edit m-0"></i>
                                  </button>
                                  <button className="btn-premium btn-premium-red btn-sm p-2" onClick={() => handleDelete(emp.EMP_Slno)} title="Delete">
                                    <i className="fa fa-trash m-0"></i>
                                  </button>
                                </div>
                              ) : emp[col.key] || '-'}
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

      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="xl" className="premium-modal">
        <Modal.Header closeButton className="border-0 px-4 pt-4 pb-0">
          <Modal.Title className="fw-bold d-flex align-items-center">
            <div className="icon-box-sm me-3">
              <i className={`fa ${editMode ? 'fa-user-edit' : 'fa-user-plus'}`}></i>
            </div>
            {editMode ? 'Edit Employee Details' : 'Add New Employee'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body className="px-4 py-4">
            <div className="d-flex justify-content-center mb-4">
              <div className="text-center">
                <div className="upload-avatar-container mb-3">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="upload-avatar-img" />
                  ) : (
                    <div className="upload-avatar-placeholder">
                      <i className="fa fa-user fa-3x text-muted"></i>
                    </div>
                  )}
                  <label htmlFor="image-upload" className="upload-avatar-label">
                    <i className="fa fa-camera"></i>
                  </label>
                  <input 
                    id="image-upload" 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    style={{ display: 'none' }}
                  />
                </div>
                <p className="small text-muted mb-0">Upload Employee Photo</p>
              </div>
            </div>

            <div className="premium-card bg-light border-0 p-4 mb-4">
              <h6 className="fw-bold mb-3 text-uppercase small text-primary d-flex align-items-center">
                <i className="fa fa-id-card me-2"></i> Primary Information
              </h6>
              <Row className="g-3">
                <Col md={3}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-muted text-uppercase">Employee Code</Form.Label>
                    <Form.Control
                      type="text" name="EMP_Code" className="form-control"
                      value={formData.EMP_Code} onChange={handleInputChange}
                      placeholder="e.g. EMP001" required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-muted text-uppercase">Full Name</Form.Label>
                    <Form.Control
                      type="text" name="EMP_Name" className="form-control"
                      value={formData.EMP_Name} onChange={handleInputChange}
                      placeholder="Enter full name" required
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-muted text-uppercase">Previous ID</Form.Label>
                    <Form.Control
                      type="text" name="EMP_PREV_ID" className="form-control"
                      value={formData.EMP_PREV_ID} onChange={handleInputChange}
                      placeholder="Optional"
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>

            <div className="premium-card bg-light border-0 p-4 mb-4">
              <h6 className="fw-bold mb-3 text-uppercase small text-primary d-flex align-items-center">
                <i className="fa fa-briefcase me-2"></i> Employment & Location
              </h6>
              <Row className="g-3">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-muted text-uppercase">Department</Form.Label>
                    <Form.Select
                      name="EMP_DEPT_DR" className="form-select"
                      value={formData.EMP_DEPT_DR} onChange={handleInputChange}
                    >
                      <option value="">Select Department</option>
                      {masterData.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-muted text-uppercase">Designation</Form.Label>
                    <Form.Select
                      name="EMP_DESIG_DR" className="form-select"
                      value={formData.EMP_DESIG_DR} onChange={handleInputChange}
                    >
                      <option value="">Select Designation</option>
                      {masterData.designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-muted text-uppercase">Location</Form.Label>
                    <Form.Select
                      name="EMP_LOC_DR" className="form-select"
                      value={formData.EMP_LOC_DR} onChange={handleInputChange}
                    >
                      <option value="">Select Location</option>
                      {masterData.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-muted text-uppercase">Join Date</Form.Label>
                    <Form.Control
                      type="date" name="EMP_JOIN_DATE" className="form-control"
                      value={formData.EMP_JOIN_DATE} onChange={handleInputChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-muted text-uppercase">Overtime (OT)</Form.Label>
                    <Form.Select
                      name="EMP_OT_DR" className="form-select"
                      value={formData.EMP_OT_DR} onChange={handleInputChange}
                    >
                      <option value="">Select OT Rule</option>
                      {/* Assuming OT rules are in master data or static */}
                      <option value="1">Standard OT</option>
                      <option value="2">No OT</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-muted text-uppercase">Unique Code</Form.Label>
                    <Form.Control
                      type="text" name="EMP_UNIQ_CODE" className="form-control"
                      value={formData.EMP_UNIQ_CODE} onChange={handleInputChange}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>

            <div className="premium-card bg-light border-0 p-4 mb-4">
              <h6 className="fw-bold mb-3 text-uppercase small text-primary d-flex align-items-center">
                <i className="fa fa-user me-2"></i> Personal & Bank Details
              </h6>
              <Row className="g-3">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-muted text-uppercase">Date of Birth</Form.Label>
                    <Form.Control
                      type="date" name="EMP_DOB" className="form-control"
                      value={formData.EMP_DOB} onChange={handleInputChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-muted text-uppercase">Nationality</Form.Label>
                    <Form.Select
                      name="EMP_NATION_DR" className="form-select"
                      value={formData.EMP_NATION_DR} onChange={handleInputChange}
                    >
                      <option value="">Select Nationality</option>
                      {/* Using the master data logic if available, otherwise simplified */}
                      <option value="1">Saudi Arabian</option>
                      <option value="2">Indian</option>
                      <option value="3">Pakistani</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-muted text-uppercase">Religion</Form.Label>
                    <Form.Select
                      name="EMP_RELIGION_DR" className="form-select"
                      value={formData.EMP_RELIGION_DR} onChange={handleInputChange}
                    >
                      <option value="">Select Religion</option>
                      <option value="1">Islam</option>
                      <option value="2">Hinduism</option>
                      <option value="3">Christianity</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={8}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-muted text-uppercase">Address</Form.Label>
                    <Form.Control
                      as="textarea" rows={1} name="EMP_ADDRESS" className="form-control"
                      value={formData.EMP_ADDRESS} onChange={handleInputChange}
                      placeholder="Full residential address"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-muted text-uppercase">Lab No / MOL No</Form.Label>
                    <div className="d-flex gap-2">
                      <Form.Control
                        type="text" name="EMP_LAB_NO" className="form-control"
                        value={formData.EMP_LAB_NO} onChange={handleInputChange}
                        placeholder="Lab"
                      />
                      <Form.Control
                        type="text" name="EMP_MOL_NO" className="form-control"
                        value={formData.EMP_MOL_NO} onChange={handleInputChange}
                        placeholder="MOL"
                      />
                    </div>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-muted text-uppercase">Bank Name</Form.Label>
                    <Form.Select
                      name="EMP_BANK_DR" className="form-select"
                      value={formData.EMP_BANK_DR} onChange={handleInputChange}
                    >
                      <option value="">Select Bank</option>
                      <option value="1">Al Rajhi Bank</option>
                      <option value="2">SNB</option>
                      <option value="3">Riyad Bank</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-muted text-uppercase">Branch / Swift</Form.Label>
                    <div className="d-flex gap-2">
                      <Form.Control
                        type="text" name="EMP_BRANCH" className="form-control"
                        value={formData.EMP_BRANCH} onChange={handleInputChange}
                        placeholder="Branch"
                      />
                      <Form.Control
                        type="text" name="EMP_SWIFT_CODE" className="form-control"
                        value={formData.EMP_SWIFT_CODE} onChange={handleInputChange}
                        placeholder="Swift"
                      />
                    </div>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-muted text-uppercase">Account Number</Form.Label>
                    <Form.Control
                      type="text" name="EMP_AC_NO" className="form-control"
                      value={formData.EMP_AC_NO} onChange={handleInputChange}
                      placeholder="IBAN or A/C No"
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>
          </Modal.Body>
          <Modal.Footer className="border-0 px-4 pt-0 pb-4 d-flex justify-content-end gap-2">
            <button type="button" className="btn-premium btn-premium-secondary px-4" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-premium btn-premium-primary px-5">
              {editMode ? 'Save Changes' : 'Register Employee'}
            </button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}

export default Employees;
