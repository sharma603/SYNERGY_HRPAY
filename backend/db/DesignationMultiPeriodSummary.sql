USE [DOT_SHANOON_ENGINEERING]
GO

/****** Object:  StoredProcedure [dbo].[DesignationMultiPeriodSummary] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DesignationMultiPeriodSummary]') AND type in (N'P', N'PC'))

CREATE PROCEDURE [dbo].[DesignationMultiPeriodSummary]
(
    @PayPeriods NVARCHAR(MAX),
    @Designation NVARCHAR(MAX) = NULL,
    @Employees NVARCHAR(MAX) = NULL,
    @Projects NVARCHAR(MAX) = NULL,
    @Sections NVARCHAR(MAX) = NULL,
    @Companies NVARCHAR(MAX) = NULL,
    @Departments NVARCHAR(MAX) = NULL,
    @Employers NVARCHAR(MAX) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @cols NVARCHAR(MAX);
    DECLARE @query NVARCHAR(MAX);

    ------------------------------------------------------------
    -- 1. Build Dynamic Columns based on Pay Periods
    ------------------------------------------------------------
    SELECT @cols = STRING_AGG(
    CAST('
    SUM(CASE WHEN PayPeriod = ''' + value + ''' 
        THEN EmployeeCount ELSE 0 END) AS [' + value + ' Count],

    SUM(CASE WHEN PayPeriod = ''' + value + ''' 
        THEN Amount ELSE 0 END) AS [' + value + ' Amount]' AS NVARCHAR(MAX))
    , ',')
    WITHIN GROUP (ORDER BY value)
    FROM STRING_SPLIT(@PayPeriods, ',');

    ------------------------------------------------------------
    -- 2. Build and Execute the Pivot Query
    ------------------------------------------------------------
    SET @query = '
    WITH CostData AS
    (
        SELECT
            PPD.HRM_PAY_PERIOD_DESC AS PayPeriod,
            EMP.EMP_SLNO AS empid,
            ISNULL(des.COM_DESC, ''No Designation'') AS Designation,
            SUM(ISNULL(PRD.PRD_AMT,0) * ISNULL(PRD.PRD_SIGN,1)) AS Amount

        FROM HRM_PR_PROCESS_DET PRD
        JOIN HRM_PR_PROCESS PRP
            ON PRP.PRP_SLNO = PRD.PRD_PROCESS_PR
        JOIN HRM_EMP_MASTER EMP
            ON EMP.EMP_SLNO = PRP.PRP_EMP_MASTER_DR
        JOIN HRM_PAY_PERIODS PPD
            ON PRP.PRP_PPD_DR = PPD.HRM_PAY_PERIOD_SLNO
        LEFT JOIN COMMONCODES des
            ON des.COM_SLNO = EMP.EMP_DESIG_DR
        LEFT JOIN COMMONCODES sec
            ON sec.COM_SLNO = EMP.EMP_SECTION_DR
        LEFT JOIN COMMONCODES dept
            ON dept.COM_SLNO = EMP.EMP_DEPT_DR
        LEFT JOIN COMPANY comp
            ON comp.ID = EMP.EMP_COMPANY_ID
        LEFT JOIN COMMONCODES empr
            ON empr.COM_SLNO = EMP.EMP_TYPE_CC_DR
        LEFT JOIN COMMONCODES proj
            ON proj.COM_SLNO = EMP.EMP_LOC_DR

        WHERE PPD.HRM_PAY_PERIOD_DESC IN (SELECT value FROM STRING_SPLIT(@PayPeriods, '',''))
        AND PRD.PRD_REMARK <> ''Monthly Pay''
        AND (PRD.PRD_SIGN > 0 OR (PRD.PRD_TYPE_DR = 6 AND PRD.PRD_SIGN < 0))
        
        AND (@Designation IS NULL OR @Designation = '''' OR ISNULL(des.COM_DESC, ''No Designation'') IN (SELECT value FROM STRING_SPLIT(@Designation, '','')))
        AND (@Employees IS NULL OR @Employees = '''' OR EMP.EMP_NAME IN (SELECT value FROM STRING_SPLIT(@Employees, '','')))
        AND (@Projects IS NULL OR @Projects = '''' OR proj.COM_DESC IN (SELECT value FROM STRING_SPLIT(@Projects, '','')))
        AND (@Sections IS NULL OR @Sections = '''' OR sec.COM_DESC IN (SELECT value FROM STRING_SPLIT(@Sections, '','')))
        AND (@Companies IS NULL OR @Companies = '''' OR comp.COM_Name IN (SELECT value FROM STRING_SPLIT(@Companies, '','')))
        AND (@Departments IS NULL OR @Departments = '''' OR dept.COM_DESC IN (SELECT value FROM STRING_SPLIT(@Departments, '','')))
        AND (@Employers IS NULL OR @Employers = '''' OR empr.COM_DESC IN (SELECT value FROM STRING_SPLIT(@Employers, '','')))

        GROUP BY
            PPD.HRM_PAY_PERIOD_DESC,
            EMP.EMP_SLNO,
            des.COM_DESC
    ),

    Aggregated AS
    (
        SELECT
            Designation,
            PayPeriod,
            COUNT(empid) AS EmployeeCount,
            SUM(Amount) AS Amount
        FROM CostData
        GROUP BY Designation, PayPeriod
    )

    SELECT
        Designation,
        ' + @cols + '
    FROM Aggregated
    GROUP BY Designation
    ORDER BY Designation;
    ';

    EXEC sp_executesql @query,
        N'@PayPeriods NVARCHAR(MAX), @Designation NVARCHAR(MAX), @Employees NVARCHAR(MAX), @Projects NVARCHAR(MAX), @Sections NVARCHAR(MAX), @Companies NVARCHAR(MAX), @Departments NVARCHAR(MAX), @Employers NVARCHAR(MAX)',
        @PayPeriods, @Designation, @Employees, @Projects, @Sections, @Companies, @Departments, @Employers;

    ------------------------------------------------------------
    -- 3. Return Company Info for Header
    ------------------------------------------------------------
    SELECT TOP 1 COM_Name AS COMPANY_NAME FROM COMPANY;
END;
GO
