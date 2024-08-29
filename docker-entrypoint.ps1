# Ensure script stops on any error
$ErrorActionPreference = 'Stop'

# Check if the first argument:
# 1. Contains a "-"
# 2. Is NOT a recognized command
# 3. Is a file that's NOT executable
if (($args[0] -like '*-') -or  
    (!(Get-Command $args[0] -ErrorAction SilentlyContinue)) -or
    (((Test-Path $args[0] -PathType Leaf)) -and -not ((Get-Item $args[0]).Attributes -band 'ReadOnly'))) { 
    # Prepend 'node' to the argument list
    $args = @('node') + $args
}

# Execute the (potentially modified) command
& $args[0] $args[1..($args.Length-1)]