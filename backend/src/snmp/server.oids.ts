// ===== UNIVERSAL SNMP OIDs (Linux & Windows) =====

// System Information
export const SYSTEM_DESCRIPTION_OID = "1.3.6.1.2.1.1.1.0"; // sysDescr
export const SYSTEM_UPTIME_OID = "1.3.6.1.2.1.1.3.0"; // sysUpTime (centiseconds)
export const SYSTEM_CONTACT_OID = "1.3.6.1.2.1.1.4.0"; // sysContact
export const SYSTEM_NAME_OID = "1.3.6.1.2.1.1.5.0"; // sysName (hostname)
export const SYSTEM_LOCATION_OID = "1.3.6.1.2.1.1.6.0"; // sysLocation

// ===== HOST RESOURCES MIB (RFC 2790) - Suportado por Linux e Windows =====

// CPU Information
export const HOST_CPU_LOAD_OID = "1.3.6.1.2.1.25.3.2.1.3"; // hrProcessorLoad

// Memory Information
export const HOST_MEMORY_SIZE_OID = "1.3.6.1.2.1.25.2.2.0"; // hrMemorySize (em KB)

// Storage (Disks) - TABLE
export const HOST_STORAGE_TABLE_OID = "1.3.6.1.2.1.25.2.3.1"; // hrStorageTable
export const HOST_STORAGE_INDEX_OID = "1.3.6.1.2.1.25.2.3.1.1"; // hrStorageIndex
export const HOST_STORAGE_TYPE_OID = "1.3.6.1.2.1.25.2.3.1.2"; // hrStorageType
export const HOST_STORAGE_DESCR_OID = "1.3.6.1.2.1.25.2.3.1.3"; // hrStorageDescr
export const HOST_STORAGE_ALLOCATION_UNITS_OID = "1.3.6.1.2.1.25.2.3.1.4"; // hrStorageAllocationUnits
export const HOST_STORAGE_SIZE_OID = "1.3.6.1.2.1.25.2.3.1.5"; // hrStorageSize (total)
export const HOST_STORAGE_USED_OID = "1.3.6.1.2.1.25.2.3.1.6"; // hrStorageUsed

// Network Interfaces - TABLE
export const IF_TABLE_OID = "1.3.6.1.2.1.2.2.1"; // ifTable
export const IF_INDEX_OID = "1.3.6.1.2.1.2.2.1.1"; // ifIndex
export const IF_DESCR_OID = "1.3.6.1.2.1.2.2.1.2"; // ifDescr
export const IF_TYPE_OID = "1.3.6.1.2.1.2.2.1.3"; // ifType
export const IF_MTU_OID = "1.3.6.1.2.1.2.2.1.4"; // ifMtu
export const IF_SPEED_OID = "1.3.6.1.2.1.2.2.1.5"; // ifSpeed
export const IF_PHYS_ADDRESS_OID = "1.3.6.1.2.1.2.2.1.6"; // ifPhysAddress (MAC)
export const IF_OPER_STATUS_OID = "1.3.6.1.2.1.2.2.1.8"; // ifOperStatus (1=up, 2=down)
export const IF_IN_OCTETS_OID = "1.3.6.1.2.1.2.2.1.10"; // ifInOctets
export const IF_OUT_OCTETS_OID = "1.3.6.1.2.1.2.2.1.16"; // ifOutOctets
export const IF_IN_ERRORS_OID = "1.3.6.1.2.1.2.2.1.14"; // ifInErrors
export const IF_OUT_ERRORS_OID = "1.3.6.1.2.1.2.2.1.20"; // ifOutErrors

// ===== IP MIB (RFC 1213) - Para descobrir IP de interfaces =====
export const IP_ADDR_TABLE_OID = "1.3.6.1.2.1.4.20.1"; // ipAddrTable
export const IP_ADDR_ENT_ADDR_OID = "1.3.6.1.2.1.4.20.1.1"; // ipAdEntAddr
export const IP_ADDR_ENT_IF_INDEX_OID = "1.3.6.1.2.1.4.20.1.2"; // ipAdEntIfIndex

// ===== LINUX SPECIFIC (NET-SNMP) =====

// Memory detailed (UCD-SNMP-MIB)
export const LINUX_MEM_TOTAL_OID = "1.3.6.1.4.1.2021.4.5.0"; // memTotalReal
export const LINUX_MEM_AVAIL_OID = "1.3.6.1.4.1.2021.4.6.0"; // memAvailReal (available)
export const LINUX_MEM_USED_OID = "1.3.6.1.4.1.2021.4.9.0"; // memUsedReal

// CPU Load Average (UCD-SNMP-MIB)
export const LINUX_CPU_LOAD_1MIN_OID = "1.3.6.1.4.1.2021.10.1.3.1"; // laLoad.1
export const LINUX_CPU_LOAD_5MIN_OID = "1.3.6.1.4.1.2021.10.1.3.2"; // laLoad.2
export const LINUX_CPU_LOAD_15MIN_OID = "1.3.6.1.4.1.2021.10.1.3.3"; // laLoad.3

// CPU Detailed (UCD-SNMP-MIB)
export const LINUX_CPU_USER_OID = "1.3.6.1.4.1.2021.11.9.0"; // ssCpuUser
export const LINUX_CPU_SYSTEM_OID = "1.3.6.1.4.1.2021.11.10.0"; // ssCpuSystem
export const LINUX_CPU_IDLE_OID = "1.3.6.1.4.1.2021.11.11.0"; // ssCpuIdle
export const LINUX_CPU_WAIT_OID = "1.3.6.1.4.1.2021.11.53.0"; // ssCpuWait

// Processes (UCD-SNMP-MIB)
export const LINUX_PROCESS_COUNT_OID = "1.3.6.1.4.1.2021.2.1.25.0"; // procs

// ===== WINDOWS SPECIFIC (HOST-RESOURCES-MIB + WINDOWS-NT-MIB) =====

// Windows Performance Counter via SNMP (geralmente via SNMP extension DLL)
// Nota: Windows requer instalação de SNMP services
// OIDs podem variar dependendo da implementação

export const WINDOWS_PERFORMANCE_OID = "1.3.6.1.4.1.311.1.1.3.1.1.1"; // Microsoft enterprises
