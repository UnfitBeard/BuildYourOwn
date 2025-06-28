typedef enum
{
    OBJ_INT,
    OBJ_PAIR
} ObjectType;

// tagged union
typedef struct sObject
{
    /*The next object in the list of all objects*/
    struct sObject *next;
    unsigned char marked; /* is this object marked? */
    ObjectType type;      /* what kind of value is it? int : pair */

    union
    {
        // OBJ_INT
        int value;

        // OBJ_PAIR
        struct
        {
            struct sObject *head;
            struct sObject *tail;
        };
    };
} Object;

/* VM - will contain the stack that stores the variables currently in scope */
#define STACK_MAX 256
#define INITIAL_GC_THRESHOLD 10 // Unreal
typedef struct
{
    /*Total number of currently allocated objects*/
    int numObjects;
    /*Number of objects required to trigger a GC*/
    int maxObjects;
    /*The first object (head) in the list of all objects*/
    Object *firstObject;
    Object *stack[STACK_MAX];
    int stackSize;
} VM;

// Create and initialize a vm
VM *newVM()
{
    VM *vm = malloc(sizeof(VM));
    vm->stackSize = 0;

    vm->numObjects = 0;
    vm->maxObjects = INITIAL_GC_THRESHOLD;
    return vm;
}

// manipulate the stack
void push(VM *vm, Object *value)
{
    assert(vm->stackSize < STACK_MAX, "Stack overflow!");
    vm->stack[vm->stackSize++] = value;
};

Object *pop(VM *vm)
{
    assert(vm->stackSize > 0, "Stack underflow!");
    return vm->stack[--vm->stackSize];
};

// Helper functions to create objects
// this does memory allocations
Object *newObject(VM *vm, ObjectType type)
{
    if (vm->numObjects >= vm->maxObjects)
    {
        gc(vm); // run garbage collection if we hit the limit
    }

    Object *object = malloc(sizeof(Object));
    object->type = type;
    object->marked = 0; // not marked yet

    /* Insert it into a list of marked objects */
    object->next = vm->firstObject;
    vm->firstObject = object;
    vm->numObjects++;
    return object;
}

// this ones push actual obejcts onto the VMs stack
// pushing ints
void pushInt(VM *vm, int intValue)
{
    Object *object = newObject(vm, OBJ_INT);
    object->value = intValue;
    push(vm, object);
}

// pushing Pairs
Object *pushPair(VM *vm)
{
    Object *object = newObject(vm, OBJ_PAIR);
    object->tail = pop(vm);
    object->head = pop(vm);

    push(vm, object);
    return object;
}

/* start the marking */
/* mark all reachable stuff - walk the stack*/
void markAll(VM *vm)
{
    for (int i = 0; i < vm->stackSize; i++)
    {
        mark(vm->stack[i]);
    }
}

// mark an object
void mark(Object *object)
{
    /* we also need to check if its already marked to avoid recursing on cycles*/
    if (object->marked)
    {
        return; // already marked, nothing to do
    };
    object->marked = 1;

    /* Reachability is recursive */
    if (object->type == OBJ_PAIR)
    {
        mark(object->head);
        mark(object->tail);
    }
}

// Sweeping
void sweep(VM *vm)
{
    Object **object = &vm->firstObject;
    while (object)
    {
        if (!(*object)->marked)
        {
            /* The object was not reachable so remove it from the list and free it*/
            Object *unreachable = *object;

            *object = unreachable->next; // remove from list
            free(unreachable);           // free the object
            vm->numObjects--;
        }
        else
        {
            /* The object was reachable, so unmark it for the next GC cycle */
            (*object)->marked = 0;
            object = &(*object)->next; // move to the next object
        }
    }
}

// Calling it
void gc(VM *vm)
{
    int numObjects = vm->numObjects;

    markAll(vm);
    sweep(vm);

    vm->maxObjects = vm->numObjects * 2;
}

// How about tracking the number of objects we've created
