# FSM
# 1 location(s):
#   Clover_18 / Fountains Group/Memory Orb Scene/Memory Orb Group 1/thread_memory_orb_source

fsm FSM {
  start Init

  state Idle {
    FadeNestedFadeGroup(Target=var "Whole Fader", ToAlpha=0, FadeTime=1.5)
    FadeNestedFadeGroup(Target=var "Hint Fader", ToAlpha=1, FadeTime=3)
    FadeNestedFadeGroup(Target=var "Bloom", ToAlpha=0, FadeTime=1)
    SendMessageV2(gameObject=Self, delivery=BroadcastMessage, options=1, functionCall=StopJitter(), everyFrame=false)
    CheckTrackTriggerCount(target=Fountains Group/Memory Orb Scene/Memory Orb Group 1/thread_memory_orb_source/Fade Up Range, count=0, test=MoreThan, everyFrame=true, successEvent=→"MINOR")
    on MINOR → Fade Up Minor
  }

  state Fade Up {
    CheckHeroPerformanceRegion(Target=Self, MinReactDelay=0.3, MaxReactDelay=0.5, None=→"CANCEL", ActiveInner=(none), ActiveOuter=(none), IgnoreNeedolinRange=true, useActiveBool=false, ActiveBool=(unset), StoreState=None, EveryFrame=true)
    FadeNestedFadeGroup(Target=var "Whole Fader", ToAlpha=1, FadeTime=2)
    FadeNestedFadeGroup(Target=var "Hint Fader", ToAlpha=0, FadeTime=1.25)
    Wait(time=2, finishEvent=→"FINISHED", realTime=false)
    on CANCEL → Fade Up Minor
    on FINISHED → Bloom
  }

  state Init {
    FadeNestedFadeGroup(Target=var "Whole Fader", ToAlpha=0, FadeTime=0)
    FadeNestedFadeGroup(Target=var "Hint Fader", ToAlpha=1, FadeTime=0)
    FadeNestedFadeGroup(Target=var "Bloom", ToAlpha=0, FadeTime=0)
    ActivateGameObject(gameObject=var "Burst Effects", activate=false, recursive=false, resetOnExit=false, everyFrame=false)
    NextFrameEvent(sendEvent=→"FINISHED")
    on FINISHED → Activated?
  }

  state Bloom {
    SendMessageV2(gameObject=Self, delivery=BroadcastMessage, options=1, functionCall=StartJitter(), everyFrame=false)
    FadeNestedFadeGroup(Target=var "Bloom", ToAlpha=0.5, FadeTime=0.5)
    Wait(time=0.75, finishEvent=→"FINISHED", realTime=false)
    on FINISHED → Spawn Orbs
  }

  state Burst {
    SendMessageV2(gameObject=Self, delivery=BroadcastMessage, options=1, functionCall=StopJitter(), everyFrame=false)
    FadeNestedFadeGroup(Target=var "Whole Fader", ToAlpha=0, FadeTime=0)
    DoCameraShakeV2(Target=Self, MaxCameraDistance=(unset), Camera=Main Camera (dataassets_assets_assets/dataassets/camerashake.bundle), Profile=Average Shake (dataassets_assets_assets/dataassets/camerashake.bundle), DoFreeze=true, Delay=0, CancelOnExit=false)
    ActivateGameObject(gameObject=var "Burst Effects", activate=true, recursive=false, resetOnExit=false, everyFrame=false)
    FadeNestedFadeGroup(Target=var "Bloom", ToAlpha=0, FadeTime=1)
    Wait(time=0.5, finishEvent=→"FINISHED", realTime=false)
    ShowCustomNeedolinMsg(Text={Sheet="Song", Key=var "Song Cell"}, Timer=5)
    SendEvent(eventTarget=Self, sendEvent=→"FINISHED", delay=0, everyFrame=false)
  }

  state Activated? {
    BoolTest(boolVariable=var "Activated", isTrue=→"TRUE", isFalse=→"FALSE", everyFrame=false)
    on TRUE → Activated
    on FALSE → Idle
  }

  state Activated {
    ActivateGameObject(gameObject=Self, activate=false, recursive=false, resetOnExit=false, everyFrame=false)
  }

  state Spawn Orbs {
    BoolTest(boolVariable=var "Boss Spawner", isTrue=→"BOSS", isFalse=(none), everyFrame=false)
    CallMethodProper(gameObject=var "Memory Orb Group", behaviour="MemoryOrbGroup", methodName="Appear", parameters=[], storeResult=(unset var), EveryFrame=false)
    SetBoolValue(boolVariable=var "Activated", boolValue=true, everyFrame=false)
    on FINISHED → Burst
    on BOSS → Boss Start
  }

  state Fade Up Minor {
    CheckTrackTriggerCount(target=Fountains Group/Memory Orb Scene/Memory Orb Group 1/thread_memory_orb_source/Fade Up Range, count=0, test=LessThanOrEqual, everyFrame=true, successEvent=→"CANCEL")
    CheckHeroPerformanceRegion(Target=Self, MinReactDelay=0.5, MaxReactDelay=0.5, None=(none), ActiveInner=→"PLAYING", ActiveOuter=(none), IgnoreNeedolinRange=true, useActiveBool=false, ActiveBool=(unset), StoreState=None, EveryFrame=true)
    FadeNestedFadeGroup(Target=var "Whole Fader", ToAlpha=0.5, FadeTime=3)
    FadeNestedFadeGroup(Target=var "Hint Fader", ToAlpha=0, FadeTime=2)
    on CANCEL → Idle
    on PLAYING → In Range?
  }

  state In Range? {
    CheckTrackTriggerCount(target=Fountains Group/Memory Orb Scene/Memory Orb Group 1/thread_memory_orb_source/Needolin Range, count=0, test=MoreThan, everyFrame=true, successEvent=→"FULL")
    CheckHeroPerformanceRegion(Target=Self, MinReactDelay=0.3, MaxReactDelay=0.5, None=→"CANCEL", ActiveInner=(none), ActiveOuter=(none), IgnoreNeedolinRange=true, useActiveBool=false, ActiveBool=(unset), StoreState=None, EveryFrame=true)
    on CANCEL → Fade Up Minor
    on FULL → Fade Up
  }

  state Boss Start {
    SendEventToRegister(eventName="BOSS START")
    on FINISHED → Burst 2
  }

  state Burst 2 {
    SendMessageV2(gameObject=Self, delivery=BroadcastMessage, options=1, functionCall=StopJitter(), everyFrame=false)
    FadeNestedFadeGroup(Target=var "Whole Fader", ToAlpha=0, FadeTime=0)
    DoCameraShakeV2(Target=Self, MaxCameraDistance=(unset), Camera=Main Camera (dataassets_assets_assets/dataassets/camerashake.bundle), Profile=Average Shake (dataassets_assets_assets/dataassets/camerashake.bundle), DoFreeze=true, Delay=0, CancelOnExit=false)
    ActivateGameObject(gameObject=var "Burst Effects", activate=true, recursive=false, resetOnExit=false, everyFrame=false)
    FadeNestedFadeGroup(Target=var "Bloom", ToAlpha=0, FadeTime=1)
    Wait(time=0.5, finishEvent=→"FINISHED", realTime=false)
    SendEvent(eventTarget=Self, sendEvent=→"FINISHED", delay=0, everyFrame=false)
  }

  var Boss Spawner: bool = false
  var Song Cell: string = "THREAD_MEMORY_CLOVER_LAKE"
  var Memory Orb Group: gameObject = Fountains Group/Memory Orb Scene/Memory Orb Group 1

  var Activated: bool = false
  var Bloom: gameObject = Fountains Group/Memory Orb Scene/Memory Orb Group 1/thread_memory_orb_source/Bloom
  var Burst Effects: gameObject = Fountains Group/Memory Orb Scene/Memory Orb Group 1/thread_memory_orb_source/Finish Effects
  var Hint Fader: gameObject = Fountains Group/Memory Orb Scene/Memory Orb Group 1/thread_memory_orb_source/thread_memory_starter
  var Whole Fader: gameObject = Fountains Group/Memory Orb Scene/Memory Orb Group 1/thread_memory_orb_source/fade
}
