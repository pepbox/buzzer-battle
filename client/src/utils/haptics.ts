export const handleHaptic=()=>{
    if("vibrate" in navigator){
        navigator.vibrate(70)
    }
} 