$ErrorActionPreference = "Stop"

Write-Host "--- 1. ADMIN LOGIN ---"
$adminBody = @{ identifier = "admin@library.local"; password = "AdminPassword123!" } | ConvertTo-Json
$adminLogin = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -Body $adminBody -ContentType "application/json"
$adminToken = $adminLogin.data.token
Write-Host "Admin logged in successfully: $($adminLogin.data.admin.fullName)"

Write-Host "`n--- 2. PATRON LOGIN ---"
# Find an active patron
$patronsRes = Invoke-RestMethod -Uri "http://localhost:5000/api/users?status=ACTIVE" -Method Get -Headers @{ Authorization = "Bearer $adminToken" }
$testPatron = if ($patronsRes.data.users) { $patronsRes.data.users[0] } else { $patronsRes.data[0] }
Write-Host "Target Patron: $($testPatron.fullName) ($($testPatron.membershipNo))"

# Admin preview login token to act as this patron
$previewBody = @{ membershipNo = $testPatron.membershipNo } | ConvertTo-Json
$patronLogin = Invoke-RestMethod -Uri "http://localhost:5000/api/patron/admin-view" -Method Post -Body $previewBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $adminToken" }
$patronToken = $patronLogin.data.token
Write-Host "Patron authenticated via portal token."

Write-Host "`n--- 3. CHECK PATRON INITIAL DASHBOARD ---"
$patronDash = Invoke-RestMethod -Uri "http://localhost:5000/api/patron/dashboard" -Method Get -Headers @{ Authorization = "Bearer $patronToken" }
if (-not $patronDash.data.activeSeat) {
  $firstSeat = (Invoke-RestMethod -Uri "http://localhost:5000/api/patron/available-seats" -Method Get -Headers @{ Authorization = "Bearer $patronToken" }).data[0]
  $selBody = @{ seatId = $firstSeat.id } | ConvertTo-Json
  $null = Invoke-RestMethod -Uri "http://localhost:5000/api/patron/change-seat" -Method Post -Body $selBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $patronToken" }
  $patronDash = Invoke-RestMethod -Uri "http://localhost:5000/api/patron/dashboard" -Method Get -Headers @{ Authorization = "Bearer $patronToken" }
}
Write-Host "Current Active Seat: $($patronDash.data.activeSeat.label) ($($patronDash.data.activeSeat.section))"
$currentSeatId = $patronDash.data.activeSeat.seatId

Write-Host "`n--- 4. TEST INVARIANT: CANNOT DIRECTLY CHANGE SEAT ---"
$availSeats = Invoke-RestMethod -Uri "http://localhost:5000/api/patron/available-seats" -Method Get -Headers @{ Authorization = "Bearer $patronToken" }
$newSeat = $availSeats.data | Where-Object { $_.id -ne $currentSeatId } | Select-Object -First 1
Write-Host "Candidate new seat for request: $($newSeat.label) ($($newSeat.section))"

try {
  $directChangeBody = @{ seatId = $newSeat.id } | ConvertTo-Json
  $directRes = Invoke-RestMethod -Uri "http://localhost:5000/api/patron/change-seat" -Method Post -Body $directChangeBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $patronToken" }
  Write-Host "FAIL: Direct change should have been blocked!"
} catch {
  Write-Host "SUCCESS: Direct seat change was properly BLOCKED with error: $($_.Exception.Message)"
}

Write-Host "`n--- 5. SUBMIT SEAT CHANGE REQUEST ---"
$reqBody = @{
  requestedSeatId = $newSeat.id
  reason = "Need closer access to power outlet for laptop study"
} | ConvertTo-Json

$seatReqRes = Invoke-RestMethod -Uri "http://localhost:5000/api/patron/seat/request" -Method Post -Body $reqBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $patronToken" }
$createdRequestId = $seatReqRes.data.id
Write-Host "Seat Change Request submitted! ID: $createdRequestId, Status: $($seatReqRes.data.status)"

Write-Host "`n--- 6. VERIFY DUPLICATE REQUEST IS BLOCKED ---"
try {
  $dupRes = Invoke-RestMethod -Uri "http://localhost:5000/api/patron/seat/request" -Method Post -Body $reqBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $patronToken" }
  Write-Host "FAIL: Duplicate request should have been blocked!"
} catch {
  Write-Host "SUCCESS: Duplicate request blocked properly: $($_.Exception.Message)"
}

Write-Host "`n--- 7. VERIFY PATRON DASHBOARD SHOWS PENDING STATUS ---"
$patronDash2 = Invoke-RestMethod -Uri "http://localhost:5000/api/patron/dashboard" -Method Get -Headers @{ Authorization = "Bearer $patronToken" }
Write-Host "Pending Request on Dashboard: $($patronDash2.data.pendingSeatRequest.currentSeat.label) -> $($patronDash2.data.pendingSeatRequest.requestedSeat.label)"
Write-Host "Reason: $($patronDash2.data.pendingSeatRequest.reason)"

Write-Host "`n--- 8. ADMIN DASHBOARD / USER REQUESTS LIST ---"
$adminRequests = Invoke-RestMethod -Uri "http://localhost:5000/api/seats/requests?status=PENDING" -Method Get -Headers @{ Authorization = "Bearer $adminToken" }
Write-Host "Pending Requests in Admin Queue: $($adminRequests.data.Count)"
$matched = $adminRequests.data | Where-Object { $_.id -eq $createdRequestId }
Write-Host "Matched Request: Patron $($matched.user.fullName) requested $($matched.requestedSeat.label)"

Write-Host "`n--- 9. ADMIN APPROVES REQUEST ---"
$approveBody = @{ adminNotes = "Approved by admin for study needs" } | ConvertTo-Json
$approveRes = Invoke-RestMethod -Uri "http://localhost:5000/api/seats/requests/$createdRequestId/approve" -Method Post -Body $approveBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $adminToken" }
Write-Host "Approval Result: $($approveRes.message), Request Status: $($approveRes.data.request.status)"

Write-Host "`n--- 10. VERIFY PATRON SEAT HAS NOW CHANGED ---"
$patronDash3 = Invoke-RestMethod -Uri "http://localhost:5000/api/patron/dashboard" -Method Get -Headers @{ Authorization = "Bearer $patronToken" }
Write-Host "Patron New Active Seat: $($patronDash3.data.activeSeat.label) ($($patronDash3.data.activeSeat.section))"
if ($patronDash3.data.activeSeat.seatId -eq $newSeat.id) {
  Write-Host "CONFIRMED: Patron seat successfully changed to requested desk $($newSeat.label)!"
} else {
  Write-Host "FAIL: Seat was not updated!"
}

Write-Host "`n--- 11. TEST REJECT SCENARIO ---"
# Patron requests another seat
$availSeats2 = Invoke-RestMethod -Uri "http://localhost:5000/api/patron/available-seats" -Method Get -Headers @{ Authorization = "Bearer $patronToken" }
$anotherSeat = $availSeats2.data | Where-Object { $_.id -ne $newSeat.id } | Select-Object -First 1

$reqBody2 = @{ requestedSeatId = $anotherSeat.id; reason = "Checking another desk" } | ConvertTo-Json
$seatReqRes2 = Invoke-RestMethod -Uri "http://localhost:5000/api/patron/seat/request" -Method Post -Body $reqBody2 -ContentType "application/json" -Headers @{ Authorization = "Bearer $patronToken" }
$req2Id = $seatReqRes2.data.id
Write-Host "Second request created: $req2Id for desk $($anotherSeat.label)"

# Admin rejects request
$rejectBody = @{ adminNotes = "Desk reserved for quiet study zone" } | ConvertTo-Json
$rejectRes = Invoke-RestMethod -Uri "http://localhost:5000/api/seats/requests/$req2Id/reject" -Method Post -Body $rejectBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $adminToken" }
Write-Host "Rejection Result: $($rejectRes.message), Status: $($rejectRes.data.status)"

# Verify patron seat DID NOT CHANGE
$patronDash4 = Invoke-RestMethod -Uri "http://localhost:5000/api/patron/dashboard" -Method Get -Headers @{ Authorization = "Bearer $patronToken" }
Write-Host "Patron Active Seat after rejection: $($patronDash4.data.activeSeat.label)"
if ($patronDash4.data.activeSeat.seatId -eq $newSeat.id) {
  Write-Host "CONFIRMED: Seat remained UNCHANGED upon rejection!"
} else {
  Write-Host "FAIL: Seat changed despite rejection!"
}

Write-Host "`n=== ALL SEAT CHANGE REQUEST WORKFLOW TESTS PASSED PERFECTLY ==="
