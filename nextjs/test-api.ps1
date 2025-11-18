# API Testing Script for Next.js ERP Migration (PowerShell)
# Usage: .\test-api.ps1

$BaseUrl = "http://localhost:3000"
$CookieFile = "test-cookies.txt"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Next.js ERP API Testing Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Function to print test result
function Print-Result {
    param($Success, $Message)
    if ($Success) {
        Write-Host "✓ PASS: $Message" -ForegroundColor Green
    } else {
        Write-Host "✗ FAIL: $Message" -ForegroundColor Red
    }
}

# Clean up old cookies
if (Test-Path $CookieFile) {
    Remove-Item $CookieFile
}

Write-Host "Test 1: Login with valid credentials" -ForegroundColor Yellow
Write-Host "-------------------------------------"
$Username = Read-Host "Enter username"
$Password = Read-Host "Enter password" -AsSecureString
$PasswordText = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password))

$LoginBody = @{
    username = $Username
    password = $PasswordText
} | ConvertTo-Json

try {
    $LoginResponse = Invoke-WebRequest -Uri "$BaseUrl/api/auth/login" `
        -Method POST `
        -Body $LoginBody `
        -ContentType "application/json" `
        -SessionVariable Session `
        -ErrorAction Stop
    
    Print-Result $true "Login successful"
    Write-Host "Response:" ($LoginResponse.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10)
} catch {
    Print-Result $false "Login failed ($($_.Exception.Response.StatusCode))"
    Write-Host "Response:" $_.Exception.Message
    exit 1
}

Write-Host ""
Write-Host "Test 2: Get user profile" -ForegroundColor Yellow
Write-Host "------------------------"

try {
    $ProfileResponse = Invoke-WebRequest -Uri "$BaseUrl/api/auth/profile" `
        -Method GET `
        -WebSession $Session `
        -ErrorAction Stop
    
    Print-Result $true "Profile retrieved successfully"
    Write-Host "Response:" ($ProfileResponse.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10)
} catch {
    Print-Result $false "Profile retrieval failed ($($_.Exception.Response.StatusCode))"
    Write-Host "Response:" $_.Exception.Message
}

Write-Host ""
Write-Host "Test 3: Get settings" -ForegroundColor Yellow
Write-Host "--------------------"

try {
    $SettingsResponse = Invoke-WebRequest -Uri "$BaseUrl/api/settings" `
        -Method GET `
        -WebSession $Session `
        -ErrorAction Stop
    
    Print-Result $true "Settings retrieved successfully"
    Write-Host "Response:" ($SettingsResponse.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10)
} catch {
    Print-Result $false "Settings retrieval failed ($($_.Exception.Response.StatusCode))"
    Write-Host "Response:" $_.Exception.Message
}

Write-Host ""
Write-Host "Test 4: Access protected route without auth" -ForegroundColor Yellow
Write-Host "--------------------------------------------"

try {
    $UnauthResponse = Invoke-WebRequest -Uri "$BaseUrl/api/auth/profile" `
        -Method GET `
        -ErrorAction Stop
    
    Print-Result $false "Unauthorized access not blocked"
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Print-Result $true "Unauthorized access correctly blocked"
    } else {
        Print-Result $false "Unexpected status code: $($_.Exception.Response.StatusCode)"
    }
}

Write-Host ""
Write-Host "Test 5: Logout" -ForegroundColor Yellow
Write-Host "--------------"

try {
    $LogoutResponse = Invoke-WebRequest -Uri "$BaseUrl/api/auth/logout" `
        -Method POST `
        -WebSession $Session `
        -ErrorAction Stop
    
    Print-Result $true "Logout successful"
    Write-Host "Response:" ($LogoutResponse.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10)
} catch {
    Print-Result $false "Logout failed ($($_.Exception.Response.StatusCode))"
    Write-Host "Response:" $_.Exception.Message
}

Write-Host ""
Write-Host "Test 6: Access after logout" -ForegroundColor Yellow
Write-Host "---------------------------"

try {
    $PostLogoutResponse = Invoke-WebRequest -Uri "$BaseUrl/api/auth/profile" `
        -Method GET `
        -WebSession $Session `
        -ErrorAction Stop
    
    Print-Result $false "Access not denied after logout"
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Print-Result $true "Access correctly denied after logout"
    } else {
        Print-Result $false "Unexpected status code: $($_.Exception.Response.StatusCode)"
    }
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Testing Complete!" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
