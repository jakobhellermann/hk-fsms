# Deep Memory Pre Enter Effect
# 1 location(s):
#   Ant_Queen / Memory Group/here/thread_memory

fsm Deep Memory Pre Enter Effect {
  start Init

  state Idle {
    ResetAnimatorTrigger(gameObject=var "Deep Memory Pre Enter Effect", trigger="Start")
    SetAnimatorTrigger(gameObject=var "Deep Memory Pre Enter Effect", trigger="Stop")
    CheckTrackTriggerCount(target=Memory Group/here/thread_memory/Needolin Range, count=1, test=MoreThanOrEqual, everyFrame=true, successEvent=→"ENTERED ZONE")
    on ENTERED ZONE → In Zone
  }

  state In Zone {
    CheckHeroPerformanceRegion(Target=Self, MinReactDelay=0.1, MaxReactDelay=0.1, None=(none), ActiveInner=→"PLAYING NEEDOLIN", ActiveOuter=(none), IgnoreNeedolinRange=true, useActiveBool=false, ActiveBool=(unset), StoreState=None, EveryFrame=true)
    ResetAnimatorTrigger(gameObject=var "Deep Memory Pre Enter Effect", trigger="Start")
    SetAnimatorTrigger(gameObject=var "Deep Memory Pre Enter Effect", trigger="Stop")
    CheckTrackTriggerCount(target=Memory Group/here/thread_memory/Needolin Range, count=1, test=LessThan, everyFrame=true, successEvent=→"EXITED ZONE")
    on PLAYING NEEDOLIN → Pre Enter Effect
    on EXITED ZONE → Idle
  }

  state Pre Enter Effect {
    SetPositionToObject2D(gameObject=var "Deep Memory Pre Enter Effect", targetObject=var "Hero", xOffset=0, yOffset=0, everyFrame=false)
    GetHeroCState(VariableName="needolinPlayingMemory", StoreValue=var "Powerup Active", EveryFrame=true)
    CheckHeroPerformanceRegion(Target=Self, MinReactDelay=0, MaxReactDelay=0, None=→"CANCEL", ActiveInner=(none), ActiveOuter=(none), IgnoreNeedolinRange=true, useActiveBool=false, ActiveBool=(unset), StoreState=None, EveryFrame=true)
    BoolTest(boolVariable=var "Powerup Active", isTrue=(none), isFalse=→"CANCEL", everyFrame=true)
    GetFsmBool(gameObject=Self, fsmName="FSM", variableName="Allow Memory Enter", storeValue=var "Allow Memory Enter", everyFrame=true)
    BoolTest(boolVariable=var "Allow Memory Enter", isTrue=(none), isFalse=→"CANCEL", everyFrame=true)
    ResetAnimatorTrigger(gameObject=var "Deep Memory Pre Enter Effect", trigger="Stop")
    SetAnimatorTrigger(gameObject=var "Deep Memory Pre Enter Effect", trigger="Start")
    on CANCEL → In Zone
  }

  state Init {
    GetFsmBool(gameObject=Self, fsmName="FSM", variableName="Burst To Event", storeValue=var "Burst To Event", everyFrame=false)
    BoolTest(boolVariable=var "Burst To Event", isTrue=(none), isFalse=→"NOT DEEP MEMORY", everyFrame=false)
    CreateObject(gameObject=Deep Memory Pre Enter Effect (localpoolprefabs_assets_.bundle), spawnPoint=<null>, position=(0, 0, 0), rotation=(unset), storeObject=var "Deep Memory Pre Enter Effect")
    on FINISHED → Idle
    on NOT DEEP MEMORY → Not Deep Memory
  }

  state Not Deep Memory {
  }

  var Powerup Active: bool = false
  var Allow Memory Enter: bool = false
  var Burst To Event: bool = false
  var Deep Memory Pre Enter Effect: gameObject = <null>
}
