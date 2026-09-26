# FSM
# 1 location(s):
#   Greymoor_21 / thread_memory

fsm FSM {
  start Init

  state Idle {
    SetStaticVariable(variableName="needolinPlayingMemoryInRange", setValue=false, sceneTransitionsLimit=1)
    SendEventByName(eventTarget=GameObject(Self), sendEvent="EXITED ZONE", delay=0, everyFrame=false)
    FadeNestedFadeGroup(Target=var "Whole Fader", ToAlpha=0, FadeTime=1.5)
    FadeNestedFadeGroup(Target=var "Hint Fader", ToAlpha=0, FadeTime=3)
    FadeNestedFadeGroup(Target=var "Bloom", ToAlpha=0, FadeTime=1)
    SendMessageV2(gameObject=Self, delivery=BroadcastMessage, options=1, functionCall=StopJitter(), everyFrame=false)
    ConvertBoolToFloat(boolVariable=var "Activated", floatVariable=var "Delay", falseValue=0.7, trueValue=0.3, everyFrame=false)
    CheckTrackTriggerCount(target=thread_memory/Fade Up Range, count=0, test=MoreThan, everyFrame=true, successEvent=→"MINOR")
    on MINOR → Fade Up Minor
  }

  state Fade Up {
    GetHeroCState(VariableName="needolinPlayingMemory", StoreValue=var "Powerup Active", EveryFrame=true)
    SendEventByName(eventTarget=GameObject(Self), sendEvent="ENTERED ZONE", delay=0, everyFrame=false)
    BoolAllTrue(boolVariables=[var "Powerup Active", var "Burst To Event"], sendEvent=(none), storeResult=var "Free Silk Cost", everyFrame=false)
    SetStaticVariable(variableName="needolinPlayingMemoryInRange", setValue=var "Free Silk Cost", sceneTransitionsLimit=1)
    BoolAllTrue(boolVariables=[var "Allow Memory Enter", var "Powerup Active"], sendEvent=(none), storeResult=var "Powerup Active", everyFrame=true)
    BlockNeedolinTextInState(IsBlocked=var "Powerup Active")
    CheckHeroPerformanceRegion(Target=Self, MinReactDelay=0.3, MaxReactDelay=0.5, None=→"CANCEL", ActiveInner=(none), ActiveOuter=(none), IgnoreNeedolinRange=true, useActiveBool=false, ActiveBool=(unset), StoreState=None, EveryFrame=true)
    ConvertBoolToFloat(boolVariable=var "Activated", floatVariable=var "Delay", falseValue=3.5, trueValue=2, everyFrame=false)
    FadeNestedFadeGroup(Target=var "Whole Fader", ToAlpha=1, FadeTime=var "Delay")
    FadeNestedFadeGroup(Target=var "Darkener", ToAlpha=1, FadeTime=var "Delay")
    FadeNestedFadeGroup(Target=var "Hint Fader", ToAlpha=0, FadeTime=2)
    Wait(time=var "Delay", finishEvent=→"FINISHED", realTime=false)
    on CANCEL → Fade Up Minor
    on FINISHED → Burst? Hold.
  }

  state Init {
    SetGameObjectSelf(variable=var "Self", gameObject=Self, everyFrame=false)
    FadeNestedFadeGroup(Target=var "Darkener", ToAlpha=0, FadeTime=0)
    FadeNestedFadeGroup(Target=var "Whole Fader", ToAlpha=0, FadeTime=0)
    FadeNestedFadeGroup(Target=var "Hint Fader", ToAlpha=1, FadeTime=0)
    FadeNestedFadeGroup(Target=var "Bloom", ToAlpha=0, FadeTime=0)
    ActivateGameObject(gameObject=var "Burst Effects", activate=false, recursive=false, resetOnExit=false, everyFrame=false)
    NextFrameEvent(sendEvent=→"FINISHED")
    on FINISHED → Idle
  }

  state Burst Shake {
    GetHeroCState(VariableName="needolinPlayingMemory", StoreValue=var "Powerup Active", EveryFrame=true)
    BoolTest(boolVariable=var "Powerup Active", isTrue=(none), isFalse=→"FALSE", everyFrame=true)
    CheckHeroPerformanceRegion(Target=Self, MinReactDelay=0.2, MaxReactDelay=0.3, None=→"CANCEL", ActiveInner=(none), ActiveOuter=(none), IgnoreNeedolinRange=true, useActiveBool=false, ActiveBool=(unset), StoreState=None, EveryFrame=true)
    SendMessageV2(gameObject=Self, delivery=BroadcastMessage, options=1, functionCall=StartJitter(), everyFrame=false)
    ConvertBoolToFloat(boolVariable=var "Activated", floatVariable=var "Delay", falseValue=1.5, trueValue=1, everyFrame=false)
    FadeNestedFadeGroup(Target=var "Bloom", ToAlpha=1, FadeTime=var "Delay")
    Wait(time=var "Delay", finishEvent=→"FINISHED", realTime=false)
    on CANCEL → Idle
    on FALSE → Burst? Hold.
    on FINISHED → Burst
  }

  state Burst {
    SendMessageV2(gameObject=Self, delivery=BroadcastMessage, options=1, functionCall=StopJitter(), everyFrame=false)
    FadeNestedFadeGroup(Target=var "Whole Fader", ToAlpha=0, FadeTime=1)
    FadeNestedFadeGroup(Target=var "Bloom", ToAlpha=0, FadeTime=1)
    DoCameraShakeV2(Target=Self, MaxCameraDistance=(unset), Camera=Main Camera (dataassets_assets_assets/dataassets/camerashake.bundle), Profile=Average Shake (dataassets_assets_assets/dataassets/camerashake.bundle), DoFreeze=true, Delay=0, CancelOnExit=false)
    ActivateGameObject(gameObject=var "Burst Effects", activate=true, recursive=false, resetOnExit=false, everyFrame=false)
    on FINISHED → Send Event
  }

  state Fade Up Minor {
    SetStaticVariable(variableName="needolinPlayingMemoryInRange", setValue=false, sceneTransitionsLimit=1)
    SendEventByName(eventTarget=GameObject(Self), sendEvent="EXITED ZONE", delay=0, everyFrame=false)
    CheckTrackTriggerCount(target=thread_memory/Fade Up Range, count=0, test=LessThanOrEqual, everyFrame=true, successEvent=→"CANCEL")
    FadeNestedFadeGroup(Target=var "Whole Fader", ToAlpha=0, FadeTime=3)
    FadeNestedFadeGroup(Target=var "Darkener", ToAlpha=0, FadeTime=3)
    FadeNestedFadeGroup(Target=var "Hint Fader", ToAlpha=1, FadeTime=2)
    CheckHeroPerformanceRegion(Target=Self, MinReactDelay=var "Delay", MaxReactDelay=var "Delay", None=(none), ActiveInner=→"PLAYING", ActiveOuter=(none), IgnoreNeedolinRange=true, useActiveBool=false, ActiveBool=(unset), StoreState=None, EveryFrame=true)
    on CANCEL → Idle
    on PLAYING → In Range?
  }

  state Send Event {
    SetBoolValue(boolVariable=var "Activated", boolValue=true, everyFrame=false)
    SendEventToRegister(eventName="THREAD MEMORY BURST")
  }

  state Burst? Hold. {
    SendEventByNameUpwards(Target=Self, EventName="THREAD MEMORY FULL")
    BoolTest(boolVariable=var "Event Custom", isTrue=→"CUSTOM", isFalse=(none), everyFrame=false)
    CheckHeroPerformanceRegion(Target=Self, MinReactDelay=0.3, MaxReactDelay=0.5, None=→"CANCEL", ActiveInner=(none), ActiveOuter=(none), IgnoreNeedolinRange=true, useActiveBool=false, ActiveBool=(unset), StoreState=None, EveryFrame=true)
    GetHeroCState(VariableName="needolinPlayingMemory", StoreValue=var "Powerup Active", EveryFrame=true)
    BoolAllTrue(boolVariables=[var "Powerup Active", var "Burst To Event"], sendEvent=(none), storeResult=var "Free Silk Cost", everyFrame=false)
    SetStaticVariableV2(variableName="needolinPlayingMemoryInRange", setValue=var "Free Silk Cost", sceneTransitionsLimit=1, everyFrame=true)
    FloatAddV2(floatVariable=var "Powerup Timer", add=1, everyFrame=true, perSecond=true, fixedUpdate=false, activeBool=var "Powerup Active")
    BoolAllTrue(boolVariables=[var "Allow Memory Enter", var "Powerup Active"], sendEvent=(none), storeResult=var "Powerup Active", everyFrame=true)
    BlockNeedolinTextInState(IsBlocked=var "Powerup Active")
    BoolFlipEveryFrame(boolVariable=var "Powerup Active", everyFrame=true)
    SetFloatValueV2(floatVariable=var "Powerup Timer", floatValue=0, everyFrame=true, activeBool=var "Powerup Active")
    FloatTestToBool(float1=var "Powerup Timer", float2=1, tolerance=0, equalBool=(unset), lessThanBool=(unset), greaterThanBool=var "Powerup Active", everyFrame=true)
    BoolAllTrue(boolVariables=[var "Burst To Event", var "Powerup Active", var "Allow Memory Enter"], sendEvent=→"TRUE", storeResult=(unset), everyFrame=true)
    ShowCustomNeedolinMsgFromTemplate(Template={Sheet="Song", Key=var "Song Cell"}, Timer=(unset))
    FadeNestedFadeGroup(Target=var "Bloom", ToAlpha=0, FadeTime=1)
    SendMessageV2(gameObject=Self, delivery=BroadcastMessage, options=1, functionCall=StopJitter(), everyFrame=false)
    on CANCEL → Idle
    on TRUE → Deep Memory Enter
    on CUSTOM → Send Event
  }

  state In Range? {
    CheckTrackTriggerCount(target=thread_memory/Needolin Range, count=0, test=MoreThan, everyFrame=true, successEvent=→"FULL")
    CheckHeroPerformanceRegion(Target=Self, MinReactDelay=0.3, MaxReactDelay=0.5, None=→"CANCEL", ActiveInner=(none), ActiveOuter=(none), IgnoreNeedolinRange=true, useActiveBool=false, ActiveBool=(unset), StoreState=None, EveryFrame=true)
    on CANCEL → Fade Up Minor
    on FULL → Fade Up
  }

  state Deep Memory Enter {
    SendEventToRegister(eventName="NEEDOLIN LOCK")
    SendEventByName(eventTarget=GameObject(Self), sendEvent="EXITED ZONE", delay=0, everyFrame=false)
    SendEventByNameV2(eventTarget=GameObject(var "HUD Canvas"), sendEvent="OUT", delay=0, everyFrame=false)
    AddHeroInputBlocker(Blocker=Self)
    SpawnObjectFromGlobalPool(gameObject=Deep Memory Enter Black (localpoolprefabs_assets_areamemory.bundle), spawnPoint=thread_memory/Deep Memory Enter Effect Point, position=(unset), rotation=(unset), storeObject=var "Deep Memory Enter")
    SetMainCameraFovOffset(FovOffset=-1, TransitionTime=4.7, TransitionCurve=curve[(time=0, value=0, inSlope=0, outSlope=0), (time=1, value=1, inSlope=2, outSlope=2)])
    Wait(time=4.7, finishEvent=→"FINISHED", realTime=false)
    on FINISHED → Deep Memory Enter Fall
  }

  state Deep Memory Enter Fall {
    SendEventToRegister(eventName="FSM CANCEL")
    HeroControllerMethods(method=RelinquishControl, parameters=[], everyFrame=false, storeValue=(unused), isTrue=(none), isFalse=(none))
    HeroControllerMethods(method=StopAnimationControl, parameters=[], everyFrame=false, storeValue=(unused), isTrue=(none), isFalse=(none))
    TransitionToAudioSnapshot(snapshot=Off (audioobjects_assets_all.bundle), transitionTime=2)
    TransitionToAudioSnapshot(snapshot=Silent (audioobjects_assets_all.bundle), transitionTime=2)
    TransitionToAudioSnapshot(snapshot=at None (audioobjects_assets_all.bundle), transitionTime=2)
    SetMainCameraFovOffset(FovOffset=-2, TransitionTime=2, TransitionCurve=curve[(time=0, value=0, inSlope=1, outSlope=1), (time=1, value=1, inSlope=1, outSlope=1)])
    AudioPlayerOneShotSingle(audioPlayer=Audio Player UI (audioobjects_assets_all.bundle), spawnPoint=var "Hero", audioClip=Garama_weak_follow_up (herosfxstatic_assets_all.bundle), pitchMin=1, pitchMax=1, volume=1, delay=0, storePlayer=<null>)
    Tk2dPlayAnimationWithEvents(gameObject=var "Hero", clipName="Needolin Deep End", animationTriggerEvent=→"FINISHED", animationCompleteEvent=(none))
    on FINISHED → Collapse
  }

  state Collapse {
    SendEventToRegister(eventName="THREAD MEMORY COLLAPSE")
    SendEventToRegister(eventName="ENTERING MEMORY")
    AudioPlayerOneShotSingle(audioPlayer=Audio Player UI (audioobjects_assets_all.bundle), spawnPoint=var "Hero", audioClip=Garama_weak_collapse (herosfxstatic_assets_all.bundle), pitchMin=1, pitchMax=1, volume=1, delay=0, storePlayer=<null>)
    AudioPlayerOneShotSingle(audioPlayer=Audio Player UI (audioobjects_assets_all.bundle), spawnPoint=var "Hero", audioClip=hornet_fall_over_demo_end (herosfxstatic_assets_all.bundle), pitchMin=1, pitchMax=1, volume=1, delay=0, storePlayer=<null>)
    ListenForAnimationEvent(Target=var "Deep Memory Enter", Response=→"FINISHED")
    on FINISHED → Send Event
  }

  var Burst To Event: bool = false
  var Event Custom: bool = false
  var Song Cell: string = "THREAD_MEMORY_GREYMOOR_DARK"

  var Delay: float = 0
  var Powerup Timer: float = 0
  var Activated: bool = false
  var Delay Powerup: bool = false
  var Powerup Active: bool = false
  var Allow Memory Enter: bool = true
  var Free Silk Cost: bool = false
  var Whole Fader: gameObject = thread_memory/fade
  var Burst Effects: gameObject = thread_memory/Finish Effects
  var Bloom: gameObject = thread_memory/Bloom
  var Hint Fader: gameObject = thread_memory/thread_memory_starter
  var Darkener: gameObject = thread_memory/fade/darkener
  var Self: gameObject = <null>
  var Deep Memory Enter: gameObject = <null>
}
